<?php
require 'db.php';
require 'face_crypto.php';

$userId = 1;   // <-- a user_id that exists in your `user` table

// Fake embedding: 128 random numbers (a real one comes from a face model later)
$fake = [];
for ($i = 0; $i < 128; $i++) $fake[] = mt_rand() / mt_getrandmax();

// Encrypt and save
$blob = encrypt_embedding($fake);
$stmt = $pdo->prepare("INSERT INTO face_login (user_id, face_embedding) VALUES (?, ?)");
$stmt->bindValue(1, $userId, PDO::PARAM_INT);
$stmt->bindValue(2, $blob, PDO::PARAM_LOB);
$stmt->execute();
$faceId = $pdo->lastInsertId();
echo "Saved encrypted embedding as face_id $faceId (" . strlen($blob) . " bytes)<br>";

// Read it back and decrypt
$row = $pdo->query("SELECT face_embedding FROM face_login WHERE face_id = $faceId")->fetch();
$back = decrypt_embedding($row['face_embedding']);

echo "First 3 original:  " . implode(', ', array_slice($fake, 0, 3)) . "<br>";
echo "First 3 decrypted: " . implode(', ', array_slice($back, 0, 3)) . "<br>";
echo "It works!";

