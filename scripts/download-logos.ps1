# Descarga logos de marcas desde Wikipedia/Wikimedia Commons
# Uso: .\scripts\download-logos.ps1
# Los logos se guardan en public/brand-logos/{slug}.png

$outDir = "public\brand-logos"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Tabla: slug => URL directa del logo en Wikimedia Commons
$logos = @{
    "audi"          = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/320px-Audi-Logo_2016.svg.png"
    "bmw"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/320px-BMW.svg.png"
    "byd"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/BYD_Auto_logo.svg/320px-BYD_Auto_logo.svg.png"
    "changan"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Changan_Automobile_logo.svg/320px-Changan_Automobile_logo.svg.png"
    "chery"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Chery_logo.svg/320px-Chery_logo.svg.png"
    "chevrolet"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Chevrolet_-_old_logo.svg/320px-Chevrolet_-_old_logo.svg.png"
    "cupra"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Cupra_logo.svg/320px-Cupra_logo.svg.png"
    "deepal"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Deepal_logo.svg/320px-Deepal_logo.svg.png"
    "dfsk"          = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/DFSK_logo.svg/320px-DFSK_logo.svg.png"
    "dongfeng"      = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Dongfeng_logo.svg/320px-Dongfeng_logo.svg.png"
    "ds"            = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/DS_automobiles_logo.svg/320px-DS_automobiles_logo.svg.png"
    "fiat"          = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Fiat_Automobiles_2020_logo.svg/320px-Fiat_Automobiles_2020_logo.svg.png"
    "ford"          = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/320px-Ford_logo_flat.svg.png"
    "gac"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/GAC_Group_logo.svg/320px-GAC_Group_logo.svg.png"
    "geely"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Geely_logo.svg/320px-Geely_logo.svg.png"
    "gwm"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Great_Wall_Motors_logo.svg/320px-Great_Wall_Motors_logo.svg.png"
    "haval"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Haval_logo.svg/320px-Haval_logo.svg.png"
    "honda"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda_logo.svg/320px-Honda_logo.svg.png"
    "hyundai"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Hyundai_Motor_Company_logo.svg/320px-Hyundai_Motor_Company_logo.svg.png"
    "jac"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/JAC_Motors_logo.svg/320px-JAC_Motors_logo.svg.png"
    "jaecoo"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Jaecoo_logo.svg/320px-Jaecoo_logo.svg.png"
    "jeep"          = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Jeep_wordmark.svg/320px-Jeep_wordmark.svg.png"
    "jetour"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Jetour_logo.svg/320px-Jetour_logo.svg.png"
    "jmc"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/JMC_logo.svg/320px-JMC_logo.svg.png"
    "kia"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.svg/320px-Kia-logo.svg.png"
    "leapmotor"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Leapmotor_logo.svg/320px-Leapmotor_logo.svg.png"
    "lexus"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Lexus_division_wordmark.svg/320px-Lexus_division_wordmark.svg.png"
    "lynk-co"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Lynk_%26_Co_logo.svg/320px-Lynk_%26_Co_logo.svg.png"
    "maxus"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Maxus_logo.svg/320px-Maxus_logo.svg.png"
    "mazda"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Mazda_logo_with_Japanese_text.svg/320px-Mazda_logo_with_Japanese_text.svg.png"
    "mercedes-benz" = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/320px-Mercedes-Logo.svg.png"
    "mg"            = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/MG_Motor_logo.svg/320px-MG_Motor_logo.svg.png"
    "mini"          = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/MINI_logo_2015.svg/320px-MINI_logo_2015.svg.png"
    "nammi"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Nammi_logo.svg/320px-Nammi_logo.svg.png"
    "nissan"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nissan_2020_logo.svg/320px-Nissan_2020_logo.svg.png"
    "omoda"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Omoda_logo.svg/320px-Omoda_logo.svg.png"
    "ora"           = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Ora_logo.svg/320px-Ora_logo.svg.png"
    "peugeot"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Peugeot_2021_Logo.svg/320px-Peugeot_2021_Logo.svg.png"
    "porsche"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Porsche_logo.svg/320px-Porsche_logo.svg.png"
    "renault"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Renault_2009_logo.svg/320px-Renault_2009_logo.svg.png"
    "riddara"       = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Riddara_logo.svg/320px-Riddara_logo.svg.png"
    "skoda"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/%C5%A0koda_Auto_2016_logo.svg/320px-%C5%A0koda_Auto_2016_logo.svg.png"
    "smart"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Smart_logo_2020.svg/320px-Smart_logo_2020.svg.png"
    "ssangyong"     = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/SsangYong_logo.svg/320px-SsangYong_logo.svg.png"
    "subaru"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Subaru_logo.svg/320px-Subaru_logo.svg.png"
    "suzuki"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Suzuki_logo_2.svg/320px-Suzuki_logo_2.svg.png"
    "tesla"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Tesla_T_symbol.svg/320px-Tesla_T_symbol.svg.png"
    "toyota"        = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/320px-Toyota_carlogo.svg.png"
    "volkswagen"    = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/320px-Volkswagen_logo_2019.svg.png"
    "volvo"         = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Volvo_Cars_logo.svg/320px-Volvo_Cars_logo.svg.png"
}

$ok = 0
$fail = 0

foreach ($entry in $logos.GetEnumerator()) {
    $slug = $entry.Key
    $url  = $entry.Value
    $out  = "$outDir\$slug.png"

    # Saltar si ya existe
    if (Test-Path $out) {
        Write-Host "  ⏭  $slug (ya existe)" -ForegroundColor DarkGray
        $ok++
        continue
    }

    try {
        $wr = Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        $size = (Get-Item $out).Length
        if ($size -lt 500) {
            # Archivo demasiado pequeño = error de Wikimedia
            Remove-Item $out
            Write-Host "  ✗  $slug (respuesta vacía, edita la URL manualmente)" -ForegroundColor Red
            $fail++
        } else {
            Write-Host "  ✓  $slug" -ForegroundColor Green
            $ok++
        }
    } catch {
        Write-Host "  ✗  $slug — $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "✅ Descargados: $ok   ✗ Fallidos: $fail" -ForegroundColor Cyan
Write-Host ""
Write-Host "Logos guardados en: $outDir\" -ForegroundColor Cyan
Write-Host "Ahora corre: npx tsx --env-file=.env.local scripts/import-brands.ts"
