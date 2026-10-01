Add-Type -AssemblyName System.Drawing
$iconRoot=Split-Path $PSScriptRoot -Parent
$original=[System.Drawing.Image]::FromFile("$iconRoot\src\web\public\icon.png")
$canvas=New-Object System.Drawing.Bitmap 512,512
$paint=[System.Drawing.Graphics]::FromImage($canvas)
$paint.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$paint.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gradient=New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(0,0,512,512)),([System.Drawing.ColorTranslator]::FromHtml('#121b28')),([System.Drawing.ColorTranslator]::FromHtml('#193d36')),45
$paint.FillRectangle($gradient,0,0,512,512)
$glow=New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(65,51,182,121))
$paint.FillEllipse($glow,70,84,372,372)
$ring=New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40,138,180,248)),2
$paint.DrawEllipse($ring,35,35,442,442)
$accent=New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#8ab4f8'))
$paint.FillEllipse($accent,375,82,18,18)
$paint.DrawImage($original,[System.Drawing.Rectangle]::new(83,85,346,346))
$dot=New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#33b679'))
$paint.FillEllipse($dot,106,403,10,10)
$paint.FillEllipse($accent,122,403,10,10)
$paint.FillEllipse($dot,138,403,10,10)
$canvas.Save("$iconRoot\src\web\public\app-icon.png",[System.Drawing.Imaging.ImageFormat]::Png)
$paint.Dispose();$original.Dispose();$canvas.Dispose();$gradient.Dispose();$glow.Dispose();$ring.Dispose();$accent.Dispose();$dot.Dispose()
Copy-Item "$iconRoot\src\web\public\app-icon.png" "$iconRoot\netlify-public\app-icon.png"
