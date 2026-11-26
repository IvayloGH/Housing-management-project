<?php
$config = require __DIR__ . '/config.php';
$pdo = new PDO('mysql:unix_socket=/run/mariadbd/mysqld.sock;dbname=student_housing;charset=utf8mb4',
               'razvan', $config['db_pass'],
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
