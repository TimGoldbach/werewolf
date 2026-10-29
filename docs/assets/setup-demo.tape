# Terminal demo of `./werewolf setup` for the README, recorded with VHS
# (https://github.com/charmbracelet/vhs).
#
# Record it in a fresh clone on a release tag, with that release's images already pulled
# so the GIF does not show the download, and nothing else on port 8080:
#
#   git checkout v1.0.0
#   docker pull ghcr.io/timgoldbach/werewolf-api:v1.0.0 ghcr.io/timgoldbach/werewolf-web:v1.0.0
#   vhs docs/assets/setup-demo.tape
#   ./werewolf uninstall --yes && rm -rf instance .env

Output docs/assets/setup-demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 1100
Set Height 1240
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 60ms
Env LANG "en_US.UTF-8"

# Install the CLI's dependencies off camera.
Hide
Type "export PS1='$ ' && ./werewolf --version >/dev/null && clear"
Enter
Sleep 5s
Show

Type "./werewolf setup"
Sleep 500ms
Enter
Wait+Screen@30s /Sprache/
Sleep 1500ms

# Language: English
Enter
Sleep 800ms
Type "Moonlight Pack"
Sleep 300ms
Enter
Sleep 600ms
Type "Every full moon since 2019"
Sleep 300ms
Enter
Sleep 800ms

# Accent colour: look around, take "blood red"
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Up
Sleep 400ms
Up
Sleep 700ms
Enter
Sleep 800ms

# No logo, local network on port 8080, this system's time zone
Enter
Sleep 800ms
Enter
Sleep 800ms
Enter
Sleep 1s
Enter
Sleep 1s

# Take the generated password, no imprint
Enter
Sleep 800ms
Enter
Sleep 4s

# Confirm the summary and wait until setup is done and the shell prompt is back.
# (Wait+Screen does not see text once the terminal has scrolled, so wait for the prompt line.)
Enter
Wait@5m /^\$/
Sleep 8s
