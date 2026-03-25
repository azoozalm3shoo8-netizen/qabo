Add-Type -AssemblyName System.Drawing
$outDir = (Resolve-Path (Join-Path $PSScriptRoot '..\public')).Path
foreach ($size in @(192, 512)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(27, 127, 122))
  $g.Dispose()
  $path = Join-Path $outDir "icon-$size.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "Wrote $path"
}
