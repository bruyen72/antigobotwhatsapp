{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.chromium
    pkgs.libuuid
    pkgs.fontconfig
    pkgs.freetype
    pkgs.glib
    pkgs.nss
    pkgs.expat
    pkgs.nspr
    pkgs.dbus
    pkgs.gtk3
    pkgs.atk
    pkgs.cups
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.xorg.libXrender
    pkgs.xorg.libXtst
    pkgs.xorg.libxcb
  ];
}