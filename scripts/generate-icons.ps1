Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$iconsDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

function New-AppIcon {
  param(
    [int] $Size,
    [string] $Path,
    [bool] $Maskable = $false
  )

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $bmp.SetResolution(144, 144)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect,
    ([System.Drawing.Color]::FromArgb(255, 24, 135, 214)),
    ([System.Drawing.Color]::FromArgb(255, 126, 211, 255)),
    90
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  $safeScale = if ($Maskable) { 0.78 } else { 0.9 }
  $unit = $Size * $safeScale
  $offset = ($Size - $unit) / 2

  $glowRect = New-Object System.Drawing.RectangleF ($offset + $unit * 0.02), ($offset + $unit * 0.02), ($unit * 0.96), ($unit * 0.96)
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse($glowRect)
  $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
  $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(105, 255, 255, 255)
  $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 255, 255))
  $g.FillPath($glowBrush, $glowPath)

  $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(58, 11, 58, 95))
  $deepShadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(32, 7, 55, 105))
  $sun = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 219, 74))
  $sunHi = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(170, 255, 255, 230))
  $cloudTop = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
  $cloudBase = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 228, 246, 255))
  $rain = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 7, 96, 183))

  $sunX = $offset + $unit * 0.48
  $sunY = $offset + $unit * 0.13
  $sunD = $unit * 0.35
  $g.FillEllipse($shadow, $sunX + $unit * 0.03, $sunY + $unit * 0.045, $sunD, $sunD)
  $g.FillEllipse($sun, $sunX, $sunY, $sunD, $sunD)
  $g.FillEllipse($sunHi, $sunX + $sunD * 0.18, $sunY + $sunD * 0.16, $sunD * 0.24, $sunD * 0.24)

  $cloudPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cloudPath.StartFigure()
  $cloudPath.AddBezier(
    ($offset + $unit * 0.17), ($offset + $unit * 0.61),
    ($offset + $unit * 0.14), ($offset + $unit * 0.48),
    ($offset + $unit * 0.27), ($offset + $unit * 0.43),
    ($offset + $unit * 0.36), ($offset + $unit * 0.47)
  )
  $cloudPath.AddBezier(
    ($offset + $unit * 0.36), ($offset + $unit * 0.47),
    ($offset + $unit * 0.39), ($offset + $unit * 0.31),
    ($offset + $unit * 0.57), ($offset + $unit * 0.31),
    ($offset + $unit * 0.62), ($offset + $unit * 0.48)
  )
  $cloudPath.AddBezier(
    ($offset + $unit * 0.62), ($offset + $unit * 0.48),
    ($offset + $unit * 0.78), ($offset + $unit * 0.44),
    ($offset + $unit * 0.86), ($offset + $unit * 0.55),
    ($offset + $unit * 0.80), ($offset + $unit * 0.66)
  )
  $cloudPath.AddBezier(
    ($offset + $unit * 0.80), ($offset + $unit * 0.66),
    ($offset + $unit * 0.70), ($offset + $unit * 0.74),
    ($offset + $unit * 0.31), ($offset + $unit * 0.73),
    ($offset + $unit * 0.17), ($offset + $unit * 0.61)
  )
  $cloudPath.CloseFigure()

  $matrix = New-Object System.Drawing.Drawing2D.Matrix
  $matrix.Translate($unit * 0.025, $unit * 0.045)
  $shadowPath = $cloudPath.Clone()
  $shadowPath.Transform($matrix)
  $g.FillPath($deepShadow, $shadowPath)
  $g.FillPath($cloudBase, $cloudPath)

  $cloudTopPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $cloudTopPath.StartFigure()
  $cloudTopPath.AddBezier(
    ($offset + $unit * 0.25), ($offset + $unit * 0.58),
    ($offset + $unit * 0.31), ($offset + $unit * 0.42),
    ($offset + $unit * 0.47), ($offset + $unit * 0.40),
    ($offset + $unit * 0.58), ($offset + $unit * 0.50)
  )
  $cloudTopPath.AddBezier(
    ($offset + $unit * 0.58), ($offset + $unit * 0.50),
    ($offset + $unit * 0.50), ($offset + $unit * 0.60),
    ($offset + $unit * 0.34), ($offset + $unit * 0.63),
    ($offset + $unit * 0.25), ($offset + $unit * 0.58)
  )
  $cloudTopPath.CloseFigure()
  $g.FillPath($cloudTop, $cloudTopPath)

  foreach ($drop in @(
    @(0.36, 0.77, 0.052, 0.14),
    @(0.51, 0.80, 0.052, 0.14),
    @(0.66, 0.76, 0.052, 0.14)
  )) {
    $x = $offset + $unit * $drop[0]
    $y = $offset + $unit * $drop[1]
    $w = $unit * $drop[2]
    $h = $unit * $drop[3]
    $dropPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $dropPath.AddEllipse($x, $y + $h * 0.35, $w, $h * 0.65)
    $points = @(
      (New-Object System.Drawing.PointF ($x + $w / 2), $y),
      (New-Object System.Drawing.PointF ($x + $w), ($y + $h * 0.58)),
      (New-Object System.Drawing.PointF $x, ($y + $h * 0.58))
    )
    $dropPath.AddPolygon($points)
    $g.FillPath($rain, $dropPath)
    $dropPath.Dispose()
  }

  $cloudTopPath.Dispose()
  $shadowPath.Dispose()
  $matrix.Dispose()
  $cloudPath.Dispose()
  $glowBrush.Dispose()
  $glowPath.Dispose()
  $shadow.Dispose()
  $deepShadow.Dispose()
  $sun.Dispose()
  $sunHi.Dispose()
  $cloudTop.Dispose()
  $cloudBase.Dispose()
  $rain.Dispose()
  $g.Dispose()

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-AppIcon -Size 192 -Path (Join-Path $iconsDir 'icon-192.png')
New-AppIcon -Size 512 -Path (Join-Path $iconsDir 'icon-512.png')
New-AppIcon -Size 512 -Path (Join-Path $iconsDir 'icon-maskable-512.png') -Maskable $true
New-AppIcon -Size 180 -Path (Join-Path $iconsDir 'apple-touch-icon.png')

Write-Host 'Generated PWA icons.'
