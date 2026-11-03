"""把 index.html + rules.js + app.js 合成单文件 vpr-tool-single.html（可离线双击/微信发送）"""
import base64,pathlib
d=pathlib.Path(__file__).parent
h=(d/'index.html').read_text(encoding='utf-8')
for js in ('rules.js','app.js'):
    h=h.replace(f'<script src="{js}"></script>','<script>\n'+(d/js).read_text(encoding='utf-8')+'\n</script>')
ico='data:image/png;base64,'+base64.b64encode((d/'icons/icon-192.png').read_bytes()).decode()
h=h.replace('<link rel="manifest" href="manifest.json">','').replace('href="icons/icon-192.png"',f'href="{ico}"')
(d/'vpr-tool-single.html').write_text(h,encoding='utf-8');print('ok',len(h))
