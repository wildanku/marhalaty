<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Use session locale if set, otherwise fallback to the app default config
        $locale = $request->session()->get('locale', config('app.locale'));
        app()->setLocale($locale);

        return $next($request);
    }
}
