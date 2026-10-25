; Vellum NSIS Installer Hooks
; Ensures $INSTDIR\bin is present in User PATH environment variable
; and cleans up any raw $INSTDIR entries so the CLI wrapper takes precedence.

!macro NSIS_HOOK_POSTINSTALL
  ; If resources were extracted to _up_\bin (older version fallback), copy them to bin\
  CreateDirectory "$INSTDIR\bin"
  IfFileExists "$INSTDIR\_up_\bin\*.*" 0 +3
    CopyFiles /SILENT "$INSTDIR\_up_\bin\*.*" "$INSTDIR\bin\"
    RMDir /r "$INSTDIR\_up_"

  ; Read current user PATH from HKCU
  ReadRegStr $R0 HKCU "Environment" "PATH"
  StrCmp $R0 "" AddPathNew

  ; Check if $INSTDIR\bin is already in PATH using shlwapi::StrStrI (case-insensitive substring check)
  System::Call 'shlwapi::StrStrI(t r0, t "$INSTDIR\bin") p .r2'
  IntCmp $2 0 0 CheckBroadcast CheckBroadcast

  ; Append $INSTDIR\bin to PATH
  StrCpy $R0 "$R0;$INSTDIR\bin"
  WriteRegExpandStr HKCU "Environment" "PATH" "$R0"

CheckBroadcast:
  ; Broadcast WM_SETTINGCHANGE (0x001A) with "Environment" so Windows Explorer and terminal sessions refresh
  System::Call 'user32::SendMessageTimeout(i 0xFFFF, i 0x1A, i 0, t "Environment", i 0x2, i 5000, *i .r1) i .r0'
  goto EndHook

AddPathNew:
  WriteRegExpandStr HKCU "Environment" "PATH" "$INSTDIR\bin"
  System::Call 'user32::SendMessageTimeout(i 0xFFFF, i 0x1A, i 0, t "Environment", i 0x2, i 5000, *i .r1) i .r0'

EndHook:
!macroend
