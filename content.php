<?php
error_reporting (E_ALL);
ini_set('display_errors', 1);

$myDirectory = opendir("./content");
while($entryName = readdir($myDirectory)) {
	$dirArray[] = $entryName;
}
closedir($myDirectory);
$indexCount = count($dirArray);
sort($dirArray ,  SORT_NATURAL | SORT_FLAG_CASE);
$out = "";
for($index=0; $index < $indexCount; $index++) {
	$f = $dirArray[$index];
	$out .= "<a href=\"$f\">$f</a><br>\n";
}
echo $out;
file_put_contents("content.txt" , $out);
?>
