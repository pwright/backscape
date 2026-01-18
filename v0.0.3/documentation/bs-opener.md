# BS File Opener for Fedora

This package configures Fedora (GNOME/Wayland) to automatically open `.bs` files using the `encode-bs-share.py` Python script.

## Prerequisites

* Linux (standard GNOME environment)
* Python 3 installed
* The `encode-bs-share.py` script

## Installation

You can install this manually or use the quick setup commands below.

Open a terminal in the folder containing `encode-bs-share.py` (directory above this). Run the following block of commands. 

This will automatically register the file type and create the shortcut with the correct path.

```bash
# 1. Make the script executable
chmod +x encode-bs-share.py

# 2. Create the MIME type (File association)
mkdir -p ~/.local/share/mime/packages
cat <<EOF > ~/.local/share/mime/packages/application-x-bs-file.xml
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="[http://www.freedesktop.org/standards/shared-mime-info](http://www.freedesktop.org/standards/shared-mime-info)">
  <mime-type type="application/x-bs-file">
    <comment>BS Script File</comment>
    <glob pattern="*.bs"/>
  </mime-type>
</mime-info>
EOF

# 3. Create the Desktop Entry
# We use $PWD to get the full path of the current folder automatically
mkdir -p ~/.local/share/applications
cat <<EOF > ~/.local/share/applications/bs-opener.desktop
[Desktop Entry]
Type=Application
Name=BS Encoder Share
Comment=Process .bs files with encode-bs-share.py
Exec=$PWD/encode-bs-share.py %f
Icon=text-x-script
Terminal=true
MimeType=application/x-bs-file;
EOF

# 4. Update System Databases
update-mime-database ~/.local/share/mime
update-desktop-database ~/.local/share/applications
xdg-mime default bs-opener.desktop application/x-bs-file

echo "Installation Complete! You can now double-click .bs files."