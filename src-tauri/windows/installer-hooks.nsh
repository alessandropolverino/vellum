; Vellum NSIS Installer Hooks
; Appends Vellum installation directory ($INSTDIR) and ($INSTDIR\bin) to User PATH environment variable
; and broadcasts the setting change so open shells / new terminal windows pick up 'vellum'.

!macro NSIS_HOOK_POSTINSTALL
  ; Read current user PATH from HKCU
  ReadRegStr $R0 HKCU "Environment" "PATH"
  StrCmp $R0 "" AddPathNew

  ; Check if $INSTDIR\bin is already in PATH using shlwapi::StrStrI (case-insensitive substring check)
  System::Call 'shlwapi::StrStrI(t r0, t "$INSTDIR\bin") p .r2'
  IntCmp $2 0 0 CheckInstDir CheckInstDir

  ; Append $INSTDIR\bin to PATH
  StrCpy $R0 "$R0;$INSTDIR\bin"

CheckInstDir:
  System::Call 'shlwapi::StrStrI(t r0, t "$INSTDIR") p .r2'
  IntCmp $2 0 0 WritePath WritePath
  StrCpy $R0 "$R0;$INSTDIR"
  goto WritePath

AddPathNew:
  StrCpy $R0 "$INSTDIR;$INSTDIR\bin"

WritePath:
  WriteRegExpandStr HKCU "Environment" "PATH" "$R0"
  ; Broadcast WM_SETTINGCHANGE (0x001A) with "Environment" so Windows Explorer and terminal sessions refresh
  System::Call 'user32::SendMessageTimeout(i 0xFFFF, i 0x1A, i 0, t "Environment", i 0x2, i 5000, *i .r1) i .r0'
!macroend
