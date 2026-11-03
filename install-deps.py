#!/usr/bin/env python3
"""Optional offline-vendor installer. Needs internet only while downloading."""
from pathlib import Path
from urllib.request import urlopen,Request
from zipfile import ZipFile
from io import BytesIO
import argparse
ROOT=Path(__file__).parent
VENDOR=ROOT/'vendor'
PHASER='https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js'
COMMIT='a84159688af3ca37a4be05a0d422b94451b2e24e'
PIXELFX=f'https://github.com/patch-gg/pixelfx/archive/{COMMIT}.zip'

def download(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 NeonPrototype'}),timeout=45) as resp:
        return resp.read()
def main():
    parser=argparse.ArgumentParser(description='Install local Phaser 3.90 + optional PixelFX for offline play.')
    parser.add_argument('--with-pixelfx',action='store_true',help='Also vendor the complete PixelFX source; optional')
    args=parser.parse_args()
    VENDOR.mkdir(exist_ok=True)
    print('Downloading Phaser 3.90...')
    js=download(PHASER)
    if len(js)<100_000 or b'Phaser' not in js[:5000]:
        raise RuntimeError('Unexpected Phaser response; refusing to install.')
    (VENDOR/'phaser.min.js').write_bytes(js)
    print('Phaser:',len(js),'bytes')
    if args.with_pixelfx:
        print('Downloading pinned PixelFX commit...')
        data=download(PIXELFX)
        out=VENDOR/'pixelfx';out.mkdir(exist_ok=True)
        with ZipFile(BytesIO(data)) as z:
            for item in z.infolist():
                parts=Path(item.filename).parts
                if item.is_dir() or len(parts)<3 or parts[1]!='src':continue
                if '..' in parts:continue
                relative=Path(*parts[1:])
                target=out/relative;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes(z.read(item))
        # Keep the original licenses and notices for the vendored source.
        with ZipFile(BytesIO(data)) as z:
            names=z.namelist()
            for fn in ['LICENSE','NOTICE.md']:
                found=next((n for n in names if n.endswith('/'+fn) and n.count('/')==1),None)
                if found:(out/fn).write_bytes(z.read(found))
        print('PixelFX source installed in vendor/pixelfx/src')
    print('Done. Start run-local.bat or run-local.sh. The demo now works without external CDN.')
if __name__=='__main__':main()
