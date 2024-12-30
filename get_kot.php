<?php
// Example KOT data generation
$kotData = "Store Name\n\nKitchen Order Ticket\n\nItem 1 x2\t$20.00\nItem 2 x1\t$15.00\n\nTotal\t$35.00\n";
$kotData .= chr(27) . "d" . chr(3); // ESC/POS command to cut paper

// Output the KOT as plain text (will be base64 encoded by printService.js)
header('Content-Type: text/plain');
echo $kotData;
?>