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
        node = pkgs.nodejs;

        /*
          Prefer the caller's working tree when it looks like this repo so
          `nix run .#build` writes dist/ where you expect. Otherwise copy the
          flake source to a tempdir (needed when the tree is a pure store path).
        */
        enterProject = ''
          if [ -f ./scripts/build.mjs ] && [ -d ./themes/penguins ] && [ -f ./package.json ]; then
            :
          else
            work="$(mktemp -d)"
            cp -a ${self}/. "$work/"
            chmod -R u+w "$work"
            cd "$work"
          fi
        '';

        mkScript = name: body:
          pkgs.writeShellApplication {
            inherit name;
            runtimeInputs = [ node ];
            text = ''
              set -euo pipefail
              ${enterProject}
              ${body}
            '';
          };

        /*
          Flake apps: `nix flake show` reads meta.description when present
          (Nix ≥ 2.19 / recent nixpkgs). Keep type+program for older clients.
        */
        toApp = drv: name: description: {
          type = "app";
          program = "${drv}/bin/${name}";
          meta = { inherit description; };
        };

        scriptServe = mkScript "xpenguins-web-serve" ''
          if [ ! -f dist/xpenguins-web.js ]; then
            echo "dist missing — building…"
            node scripts/build.mjs
          fi
          exec node scripts/serve.mjs
        '';

        scriptDemo = mkScript "xpenguins-web-demo" ''
          node scripts/build.mjs
          exec node scripts/serve.mjs
        '';

        scriptBuild = mkScript "xpenguins-web-build" ''
          node scripts/build.mjs
        '';

        scriptTest = mkScript "xpenguins-web-test" ''
          node scripts/test-solids.mjs
        '';

      in {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "xpenguins-web";
          version = "0.1.0";
          src = pkgs.lib.cleanSource ./.;
          nativeBuildInputs = [ node ];
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

        apps = {
          default = toApp scriptServe "xpenguins-web-serve"
            "Serve the demo (build dist if missing) on http://127.0.0.1:8765";
          serve = toApp scriptServe "xpenguins-web-serve"
            "Serve the demo (build dist if missing) on http://127.0.0.1:8765";
          demo = toApp scriptDemo "xpenguins-web-demo"
            "Force-rebuild the bundle, then serve the playground demo";
          build = toApp scriptBuild "xpenguins-web-build"
            "Build dist/xpenguins-web.js with embedded theme sprites";
          test = toApp scriptTest "xpenguins-web-test"
            "Run geometry, ledge-scoring, and genus unit tests";
        };

        devShells.default = pkgs.mkShell {
          packages = [ node pkgs.imagemagick ];
          shellHook = ''
            echo "xpenguins-web — nix apps:"
            echo "  nix run .#serve   # static server on :8765 (builds dist if needed)"
            echo "  nix run .#demo    # force rebuild then serve"
            echo "  nix run .#build   # node scripts/build.mjs"
            echo "  nix run .#test    # geometry / genus unit tests"
            echo "  nix run           # same as #serve"
          '';
        };
      }
    );
}
