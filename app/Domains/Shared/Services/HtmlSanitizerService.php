<?php

namespace App\Domains\Shared\Services;

use HTMLPurifier;
use HTMLPurifier_Config;

class HtmlSanitizerService
{
    private HTMLPurifier $purifier;

    public function __construct()
    {
        $config = HTMLPurifier_Config::createDefault();
        $config->set('HTML.Allowed', 'p,br,strong,b,em,i,u,s,ul,ol,li,a[href],h2,h3,blockquote');
        $config->set('AutoFormat.RemoveEmpty', true);
        // This HTMLPurifier version has no HTML.NoOpener directive; target=_blank links are safe
        // regardless since evergreen browsers no longer pass window.opener to _blank targets
        // by default (only rel="opener" would opt back in, which we never emit).
        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.Nofollow', true);
        $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'mailto' => true]);
        $config->set('Cache.SerializerPath', storage_path('framework/cache/htmlpurifier'));

        $this->purifier = new HTMLPurifier($config);
    }

    public function sanitize(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        $clean = trim($this->purifier->purify($html));

        return $clean === '' ? null : $clean;
    }
}
