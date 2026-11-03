"""用法: python3 make_qr.py <URL> [床号]  → 生成可打印二维码 PNG（带标题）
依赖: pip install qrcode pillow"""
import sys,qrcode,glob
from PIL import Image,ImageDraw,ImageFont
url=sys.argv[1];bed=sys.argv[2] if len(sys.argv)>2 else ''
if bed: url+=('&' if '?' in url else '?')+'bed='+bed
q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=16,border=2);q.add_data(url);q.make(fit=True)
qi=q.make_image(fill_color='#1f3a5f',back_color='white').convert('RGB')
W=qi.width+80;H=qi.height+260;im=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(im)
fp=(glob.glob('/usr/share/fonts/**/*CJK*',recursive=True)+glob.glob('/usr/share/fonts/**/*[Ww]qy*',recursive=True)+glob.glob('C:/Windows/Fonts/msyh.ttc'))
f1=ImageFont.truetype(fp[0],46) if fp else ImageFont.load_default();f2=ImageFont.truetype(fp[0],28) if fp else f1
def c(t,y,f,col='#1f3a5f'):d.text(((W-d.textlength(t,font=f))/2,y),t,font=f,fill=col)
c('V-P-R床旁快速评估',30,f1);c('22区ICU、SICU'+(f' · {bed}床' if bed else ''),95,f2,'#4a5568')
im.paste(qi,(40,150));c('扫码评估 · 护理决策支持，以医嘱为准',H-90,f2,'#4a5568')
out=f'vpr_qr{"_"+bed if bed else ""}.png';im.save(out,dpi=(300,300));print(out,url)
