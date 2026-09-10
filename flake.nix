{
  description = "xpenguins-web — penguins walking on the DOM";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "xpenguins-web";
          version = "0.1.0";
          src = pkgs.lib.cleanSource ./.;
          nativeBuildInputs = [ pkgs.nodejs ];
          buildPhase = ''
            runHook preBuild
            node scripts/build.mjs
            runHook postBuild
          '';
          installPhase = ''
            runHook preInstall
            mkdir -p $out/share/xpenguins-web
            cp dist/xpenguins-web.js $out/share/xpenguins-web/
            cp -r examples $out/share/xpenguins-web/
            cp README.md PLAN.md TODO.md AGENTS.md $out/share/xpenguins-web/
            runHook postInstall
          '';
          meta = {
            description = "XPenguins for the web — toons walk on DOM elements";
            license = pkgs.lib.licenses.gpl2Plus;
          };
        };

        devShells.default = pkgs.mkShell {
          packages = [ pkgs.nodejs pkgs.imagemagick ];
          shellHook = ''
            echo "xpenguins-web: node scripts/build.mjs && node scripts/serve.mjs"
          '';
        };
      }
    );
}
