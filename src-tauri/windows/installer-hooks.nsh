; Vellum NSIS Installer Hooks
; Ensures $INSTDIR\bin is present in the User PATH environment variable.
;
; The PATH edit is done through PowerShell and the .NET registry API, never through
; ReadRegStr/WriteRegExpandStr: NSIS strings are limited to ~1024 chars, so a long PATH
; reads back as "" and writing it back would wipe (or truncate) the user's PATH.
; On any error the PATH is left untouched.

; Stops the live-session tunnel (bin\cloudflared.exe) if it is still running, so the installer
; and uninstaller can replace/delete the file. Only processes whose executable is exactly
; $INSTDIR\bin\cloudflared.exe are stopped; other cloudflared installs are left alone.
!macro VELLUM_STOP_TUNNEL
  System::Call 'kernel32::SetEnvironmentVariable(t "VELLUM_BIN_DIR", t "$INSTDIR\bin") i .r0'
  nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Where-Object { $$_.Path -ieq (Join-Path $$env:VELLUM_BIN_DIR \"cloudflared.exe\") } | Stop-Process -Force -ErrorAction SilentlyContinue"'
  Pop $0
  Sleep 500
!macroend

!macro NSIS_HOOK_PREINSTALL
  !insertmacro VELLUM_STOP_TUNNEL
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  !insertmacro VELLUM_STOP_TUNNEL
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Resources are bundled as directories (bin\, bin\lib\, skills\vellum-cli\) and keep their
  ; structure. If an older build extracted them to _up_\bin, copy the tree to bin\ (the
  ; wildcard form of CopyFiles also copies subdirectories, so lib\ is not flattened).
  CreateDirectory "$INSTDIR\bin"
  IfFileExists "$INSTDIR\_up_\bin\*.*" 0 +3
    CopyFiles /SILENT "$INSTDIR\_up_\bin\*.*" "$INSTDIR\bin"
    RMDir /r "$INSTDIR\_up_"

  ; 0.4.0/0.4.1 flattened skills\vellum-cli\SKILL.md to skills\SKILL.md; drop the stray copy.
  Delete "$INSTDIR\skills\SKILL.md"

  ; Write the PATH updater script to a temp file
  InitPluginsDir
  FileOpen $R1 "$PLUGINSDIR\vellum-path.ps1" w
  FileWrite $R1 "$$ErrorActionPreference = 'Stop'$\r$\n"
  FileWrite $R1 "try {$\r$\n"
  FileWrite $R1 "  $$bin = $$env:VELLUM_BIN_DIR.TrimEnd('\')$\r$\n"
  FileWrite $R1 "  if (-not $$bin) { exit 0 }$\r$\n"
  FileWrite $R1 "  $$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $$true)$\r$\n"
  FileWrite $R1 "  if ($$null -eq $$key) { exit 0 }$\r$\n"
  FileWrite $R1 "  try {$\r$\n"
  FileWrite $R1 "    $$cur = [string]$$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)$\r$\n"
  FileWrite $R1 "    $$present = $$false$\r$\n"
  FileWrite $R1 "    foreach ($$e in $$cur.Split(';')) { if ($$e.Trim().TrimEnd('\') -ieq $$bin) { $$present = $$true } }$\r$\n"
  FileWrite $R1 "    if (-not $$present) {$\r$\n"
  FileWrite $R1 "      if ($$cur -and -not $$cur.EndsWith(';')) { $$new = $$cur + ';' + $$bin } else { $$new = $$cur + $$bin }$\r$\n"
  FileWrite $R1 "      $$key.SetValue('Path', $$new, [Microsoft.Win32.RegistryValueKind]::ExpandString)$\r$\n"
  FileWrite $R1 "    }$\r$\n"
  FileWrite $R1 "  } finally { $$key.Close() }$\r$\n"
  FileWrite $R1 "} catch { exit 0 }$\r$\n"
  FileClose $R1

  System::Call 'kernel32::SetEnvironmentVariable(t "VELLUM_BIN_DIR", t "$INSTDIR\bin") i .r0'
  nsExec::Exec '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\vellum-path.ps1"'
  Pop $0
  Delete "$PLUGINSDIR\vellum-path.ps1"

  ; Broadcast WM_SETTINGCHANGE (0x001A) with "Environment" so Windows Explorer and terminal sessions refresh
  System::Call 'user32::SendMessageTimeout(i 0xFFFF, i 0x1A, i 0, t "Environment", i 0x2, i 5000, *i .r1) i .r0'
!macroend
