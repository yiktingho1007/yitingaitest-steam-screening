Set shell = CreateObject("Wscript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = "cmd /c """ & scriptDir & "\start-prototype-server.cmd"""

If WScript.Arguments.Count > 0 Then
  command = command & " " & WScript.Arguments(0)
End If

shell.Run command, 0, False
