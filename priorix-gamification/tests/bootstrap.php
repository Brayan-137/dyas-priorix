<?php

require_once __DIR__ . '/../vendor/autoload.php';

$testCase = __DIR__ . '/TestCase.php';
if (file_exists($testCase)) {
    require_once $testCase;
}
