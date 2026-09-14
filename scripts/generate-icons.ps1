Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-LabInspectionIcon {
  param(
    [int]$Size,
    [string]$OutputPath
  )

  $scale = $Size / 512.0
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#172b62"))

  $accentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#3156d3"))
  $tabBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#9fb2ff"))
  $whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $successPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#127443"), 24 * $scale)
  $detailPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#3156d3"), 22 * $scale)
  $successPen.StartCap = $successPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $successPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $detailPen.StartCap = $detailPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $detailPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  $graphics.FillEllipse($accentBrush, 72 * $scale, 72 * $scale, 368 * $scale, 368 * $scale)
  $graphics.FillRectangle($tabBrush, 179 * $scale, 137 * $scale, 154 * $scale, 48 * $scale)

  $clipboard = New-RoundedRectanglePath -X (137 * $scale) -Y (161 * $scale) -Width (238 * $scale) -Height (274 * $scale) -Radius (43 * $scale)
  $graphics.FillPath($whiteBrush, $clipboard)

  $graphics.DrawLines($successPen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(184 * $scale, 241 * $scale),
    [System.Drawing.PointF]::new(205 * $scale, 262 * $scale),
    [System.Drawing.PointF]::new(250 * $scale, 212 * $scale)
  ))
  $graphics.DrawLine($detailPen, 274 * $scale, 241 * $scale, 327 * $scale, 241 * $scale)
  $graphics.DrawLines($detailPen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(184 * $scale, 337 * $scale),
    [System.Drawing.PointF]::new(205 * $scale, 358 * $scale),
    [System.Drawing.PointF]::new(250 * $scale, 308 * $scale)
  ))
  $graphics.DrawLine($detailPen, 274 * $scale, 337 * $scale, 327 * $scale, 337 * $scale)

  $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $clipboard.Dispose()
  $detailPen.Dispose()
  $successPen.Dispose()
  $whiteBrush.Dispose()
  $tabBrush.Dispose()
  $accentBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$iconsDirectory = Join-Path $projectRoot "public\icons"
[System.IO.Directory]::CreateDirectory($iconsDirectory) | Out-Null

New-LabInspectionIcon -Size 192 -OutputPath (Join-Path $iconsDirectory "icon-192.png")
New-LabInspectionIcon -Size 512 -OutputPath (Join-Path $iconsDirectory "icon-512.png")

Write-Output "Iconos PNG generados en public/icons."
