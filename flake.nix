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
        src = pkgs.lib.cleanSource ./.;

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

        toApp = drv: name: description: {
          type = "app";
          program = "${drv}/bin/${name}";
          meta = { inherit description; };
        };

        /*
          Serve only starts the static server. Build separately with
          `nix run .#build` (or rely on packages.default / a prior build).
          Auto-building on every serve made #demo vs #serve meaningless.
        */
        scriptServe = mkScript "xpenguins-web-serve" ''
          if [ ! -f dist/xpenguins-web.js ]; then
            echo "dist/xpenguins-web.js missing — run: nix run .#build" >&2
            echo "Building once so the server can start…" >&2
            node scripts/build.mjs
          fi
          exec node scripts/serve.mjs
        '';

        scriptBuild = mkScript "xpenguins-web-build" ''
          node scripts/build.mjs
        '';

        pkg = pkgs.stdenv.mkDerivation {
          pname = "xpenguins-web";
          version = "0.1.0";
          inherit src;
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

        /*
          `nix flake check` runs these. Unit tests do not need a browser.
        */
        unitTests = pkgs.runCommand "xpenguins-web-unit-tests" {
          nativeBuildInputs = [ node ];
        } ''
          cp -a ${src}/. .
          node scripts/test-solids.mjs
          mkdir -p $out
          echo ok > $out/result
        '';

      in {
        packages.default = pkg;

        checks = {
          package = pkg;
          unit-tests = unitTests;
        };

        apps = {
          default = toApp scriptServe "xpenguins-web-serve"
            "Static server for examples/ on http://127.0.0.1:8765 (builds dist only if missing)";
          serve = toApp scriptServe "xpenguins-web-serve"
            "Static server for examples/ on http://127.0.0.1:8765 (builds dist only if missing)";
          build = toApp scriptBuild "xpenguins-web-build"
            "Write dist/xpenguins-web.js with embedded theme sprites";
        };

        devShells.default = pkgs.mkShell {
          packages = [ node pkgs.imagemagick ];
          shellHook = ''
            echo "xpenguins-web:"
            echo "  nix run .#build    # write dist/xpenguins-web.js"
            echo "  nix run .#serve    # http://127.0.0.1:8765 (build first if needed)"
            echo "  nix run            # same as #serve"
            echo "  nix flake check    # package build + unit tests"
            echo "  nix build          # installable package under result/"
          '';
        };
      }
    );
}
