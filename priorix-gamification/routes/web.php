<?php

use Illuminate\Support\Facades\Route;
use Prometheus\CollectorRegistry;
use Prometheus\RenderTextFormat;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/metrics', function (CollectorRegistry $registry) {
    $renderer = new RenderTextFormat();
    $output   = $renderer->render($registry->getMetricFamilySamples());
    return response($output, 200)->header('Content-Type', RenderTextFormat::MIME_TYPE);
});