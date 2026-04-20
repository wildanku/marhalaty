<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="light">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title inertia>{{ config('app.name', 'Laravel') }}</title>

    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
        rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet" />

    @viteReactRefresh
    @vite(['resources/js/app.tsx', 'resources/css/app.css', "resources/js/Pages/{$page['component']}.tsx"])
    @inertiaHead
</head>

<body class="font-body antialiased bg-surface text-on-surface leading-normal">
    @inertia
</body>

</html>