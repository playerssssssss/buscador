#!/usr/bin/env perl
use strict;
use warnings;
use LWP::UserAgent;
use HTML::TreeBuilder;
use JSON::PP;
use URI;
use File::Slurp qw(read_file write_file);
use Getopt::Long;

# ============================================================
# Mini Crawler educativo en Perl
# Uso: perl crawler.pl --url https://example.com
# ============================================================

my $start_url   = '';
my $max_pages   = 40;
my $max_depth   = 2;
my $delay       = 1;
my $data_dir    = './data';
my $index_file  = "$data_dir/index.json";
my $visited_file= "$data_dir/visited.json";

GetOptions(
    'url=s'     => \$start_url,
    'max=i'     => \$max_pages,
    'depth=i'   => \$max_depth,
    'delay=i'   => \$delay,
) or die "Uso: perl crawler.pl --url https://ejemplo.com [--max 40] [--depth 2]\n";

die "Debes indicar --url\n" unless $start_url;

mkdir $data_dir unless -d $data_dir;

my $ua = LWP::UserAgent->new(
    agent   => 'MiniBuscadorEducativo/1.0 (Perl; +https://github.com/playerssssssss/buscador)',
    timeout => 8,
    max_redirect => 3,
);

my $index   = load_json($index_file)   // {};
my $visited = load_json($visited_file) // {};
my @queue   = ({ url => $start_url, depth => 0 });

print "=== Mini Crawler (Perl) ===\n";
print "URL inicial : $start_url\n";
print "Máx páginas : $max_pages\n";
print "Profundidad : $max_depth\n\n";

my $crawled = 0;

while (@queue && $crawled < $max_pages) {
    my $item  = shift @queue;
    my $url   = normalize_url($item->{url});
    my $depth = $item->{depth};

    next if exists $visited->{$url};
    next if $depth > $max_depth;

    print "[$crawled] $url ... ";

    unless (allowed_by_robots($url)) {
        print "bloqueado por robots.txt\n";
        $visited->{$url} = 1;
        next;
    }

    my $res = $ua->get($url);
    unless ($res->is_success) {
        print "error: " . $res->status_line . "\n";
        $visited->{$url} = 1;
        next;
    }

    my $html = $res->decoded_content // '';
    $visited->{$url} = 1;
    $crawled++;

    my $tree = HTML::TreeBuilder->new_from_content($html);
    my $title_elem = $tree->look_down(_tag => 'title');
    my $title = $title_elem ? $title_elem->as_text : '(sin título)';
    $title =~ s/\s+/ /g;
    $title = substr($title, 0, 150);

    # Texto visible
    for my $tag (qw(script style)) {
        $_->delete for $tree->look_down(_tag => $tag);
    }
    my $text = $tree->as_text;
    $text =~ s/\s+/ /g;
    $text = substr($text, 0, 4000);

    $index->{$url} = {
        url        => $url,
        title      => $title,
        text       => $text,
        crawled_at => scalar localtime,
        depth      => $depth,
    };

    print "OK → \"$title\"\n";

    # Extraer enlaces
    if ($depth < $max_depth) {
        for my $a ($tree->look_down(_tag => 'a', href => qr/.+/)) {
            my $href = $a->attr('href') // next;
            my $abs  = make_absolute($href, $url) // next;
            $abs = normalize_url($abs);

            next if exists $visited->{$abs};
            next unless same_domain($start_url, $abs);

            push @queue, { url => $abs, depth => $depth + 1 };
        }
    }

    $tree->delete;

    save_json($index_file,   $index);
    save_json($visited_file, $visited);

    sleep $delay;
}

print "\n=== Fin ===\n";
print "Páginas en el índice: " . scalar(keys %$index) . "\n";
print "Índice guardado en: $index_file\n";

# -------------------- Funciones --------------------

sub load_json {
    my ($file) = @_;
    return undef unless -f $file;
    my $json = read_file($file, { binmode => ':utf8' });
    return decode_json($json);
}

sub save_json {
    my ($file, $data) = @_;
    write_file($file, { binmode => ':utf8' }, encode_json($data));
}

sub normalize_url {
    my ($url) = @_;
    $url =~ s/#.*$//;
    $url =~ s/\s+//g;
    return $url;
}

sub make_absolute {
    my ($href, $base) = @_;
    return undef if $href =~ /^(javascript|mailto|tel):/i;
    return undef if $href eq '' || $href =~ /^#/;

    my $uri = URI->new_abs($href, $base);
    return $uri->as_string;
}

sub same_domain {
    my ($u1, $u2) = @_;
    my $h1 = URI->new($u1)->host // '';
    my $h2 = URI->new($u2)->host // '';
    return lc($h1) eq lc($h2);
}

sub allowed_by_robots {
    my ($url) = @_;
    my $uri = URI->new($url);
    my $robots_url = $uri->scheme . '://' . $uri->host . '/robots.txt';

    my $res = $ua->get($robots_url);
    return 1 unless $res->is_success;   # si no hay robots.txt → permitido

    my $content = $res->decoded_content // '';
    if ($content =~ /User-agent:\s*\*/i && $content =~ /Disallow:\s*\/\s*$/m) {
        return 0;
    }
    return 1;
}
