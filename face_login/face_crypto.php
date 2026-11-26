<?php

function face_key(): string {
    static $key = null;
    if ($key === null) {
        $pass = (require __DIR__ . '/config.php')['face_passphrase'];
        $key = hash_pbkdf2('sha256', $pass, 'student_housing_face_v1', 600000, 32, true);
    }
    return $key;
}

function encrypt_embedding(array $floats): string {
    $iv = random_bytes(12);
    $ct = openssl_encrypt(pack('f*', ...$floats), 'aes-256-gcm',
                          face_key(), OPENSSL_RAW_DATA, $iv, $tag);
    return $iv . $tag . $ct;
}

function decrypt_embedding(string $blob): array {
    $plain = openssl_decrypt(substr($blob, 28), 'aes-256-gcm', face_key(),
                             OPENSSL_RAW_DATA, substr($blob, 0, 12), substr($blob, 12, 16));
    if ($plain === false) throw new Exception('Decryption failed (wrong key or tampered data)');
    return array_values(unpack('f*', $plain));
}
