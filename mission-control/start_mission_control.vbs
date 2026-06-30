Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\CEvns\Desktop\Antigravity\Gravity Claw\mission-control"
WshShell.Run "cmd /c npm run dev", 0, false
