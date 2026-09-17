from pathlib import Path
import fitz, io, json, shutil
from PIL import Image,ImageOps,ImageDraw
import argparse
parser=argparse.ArgumentParser(description='Reextract assets from the exact original 40-page portfolio. Image references are specific to this PDF.')
parser.add_argument('pdf', type=Path)
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1]/'public/assets')
args=parser.parse_args()
SOURCE=args.pdf.resolve()
OUT=args.output.resolve()
OUT.mkdir(parents=True,exist_ok=True)
doc=fitz.open(SOURCE)
projects={
 'brito':dict(pages=list(range(5,9)),name={'pt':'Residência Brito','en':'Brito Residence'}),
 'ambrosini':dict(pages=list(range(9,14)),name={'pt':'Residência Ambrosini','en':'Ambrosini Residence'}),
 'cool':dict(pages=list(range(14,17)),name={'pt':'Cool Barber Shop','en':'Cool Barber Shop'}),
 'pastore':dict(pages=list(range(17,22)),name={'pt':'Centro Médico Pastore','en':'Centro Médico Pastore'}),
 'r2s':dict(pages=list(range(22,27)),name={'pt':'R2S Med','en':'R2S Med'}),
 'na-regua':dict(pages=list(range(27,32)),name={'pt':'Na Régua','en':'Na Régua'}),
 'krauzer':dict(pages=[32,33],name={'pt':'Residência Krauzer','en':'Krauzer Residence'}),
 'stark':dict(pages=[34,35],name={'pt':'Residência Stark','en':'Stark Residence'}),
 'mag':dict(pages=[36,37,38],name={'pt':'MAG — Museu Águas da Guanabara','en':'MAG — Guanabara Waters Museum'}),
 'crea':dict(pages=[39],name={'pt':'CREA-RJ — Setor de Fiscalização','en':'CREA-RJ — Inspection Department'}),
}
manifest={'source':'Renata_Guimaraes_Portfolio_MOYA_PAGINA4_NOVO_LAYOUT.pdf','originalPdf':'/assets/portfolio-renata-guimaraes.pdf','notes':{'pt':'Todas as imagens foram extraídas ou renderizadas do portfólio original, sem geração artificial. As pranchas completas preservam os textos e créditos originais. Algumas imagens de origem têm resolução limitada.','en':'All images were extracted or rendered from the original portfolio, without AI generation. Full boards preserve the original wording and credits. Some source images have limited resolution.'},'projects':projects,'pages':{},'images':{}}

def save(im,name,page,caption,source_kind='embedded',crop=None):
 im=im.convert('RGB'); im.thumbnail((2000,2200),Image.Resampling.LANCZOS)
 path=OUT/(name+'.webp');im.save(path,'WEBP',quality=86,method=6)
 data={'src':'/assets/'+path.name,'width':im.width,'height':im.height,'bytes':path.stat().st_size,'sourcePage':page,'sourceKind':source_kind,'caption':caption}
 if crop:data['sourceCrop']=crop
 manifest['images'][name]=data
 return data

def embedded(xref):
 return Image.open(io.BytesIO(doc.extract_image(xref)['image'])).convert('RGB')
def clip(page,rect,width):
 r=fitz.Rect(*rect); scale=width/r.width;pm=doc[page-1].get_pixmap(matrix=fitz.Matrix(scale,scale),clip=r,alpha=False)
 return Image.frombytes('RGB',(pm.width,pm.height),pm.samples)

for slug,p in projects.items():
 for num in p['pages']:
  page=doc[num-1];pm=page.get_pixmap(matrix=fitz.Matrix(2000/page.rect.width,2000/page.rect.width),alpha=False)
  im=Image.frombytes('RGB',(pm.width,pm.height),pm.samples)
  caption={'pt':f'{p["name"]["pt"]} — prancha original do portfólio, página {num}.','en':f'{p["name"]["en"]} — original portfolio board, page {num}.'}
  data=save(im,f'page-{num:02}',num,caption,'full-page-render')
  im.thumbnail((800,800),Image.Resampling.LANCZOS)
  thumb=save(im,f'thumb-{num:02}',num,caption,'full-page-render-thumbnail')
  manifest['pages'][str(num)]={'project':slug,**data,'thumbnail':thumb['src']}

covers={
'brito':(84,5,{'pt':'Renderização noturna da fachada da Residência Brito.','en':'Night rendering of the Brito Residence façade.'}),
'ambrosini':(166,9,{'pt':'Renderização noturna da fachada da Residência Ambrosini.','en':'Night rendering of the Ambrosini Residence façade.'}),
'cool':(256,14,{'pt':'Interior da Cool Barber Shop, com tijolos aparentes, mobiliário escuro e iluminação quente.','en':'Cool Barber Shop interior with exposed brick, dark furniture and warm lighting.'}),
'pastore':(302,17,{'pt':'Renderização da recepção do Centro Médico Pastore.','en':'Rendering of the Centro Médico Pastore reception.'}),
'r2s':(765,23,{'pt':'Renderização do mezanino e da circulação do escritório R2S Med.','en':'Rendering of the R2S Med office mezzanine and circulation area.'}),
'na-regua':(874,27,{'pt':'Prancha técnica com planta, cobertura e corte para o programa Na Régua.','en':'Technical board with floor plan, roof plan and section for the Na Régua programme.'}),
'krauzer':(969,32,{'pt':'Plantas da Residência Krauzer, em colaboração com Huber Architecture.','en':'Krauzer Residence plans, in collaboration with Huber Architecture.'}),
'stark':(1009,34,{'pt':'Estudo da Residência Stark com planta e vista 3D, em colaboração com Huber Architecture.','en':'Stark Residence study with floor plan and 3D view, in collaboration with Huber Architecture.'}),
'mag':(1045,36,{'pt':'Renderização aérea do projeto acadêmico MAG — Museu Águas da Guanabara.','en':'Aerial rendering of the MAG — Guanabara Waters Museum academic project.'}),
}
for slug,(xref,page,caption) in covers.items():
 data=save(embedded(xref),'cover-'+slug,page,caption)
 projects[slug]['cover']=data['src'];projects[slug]['coverCaption']=caption
# The original CREA board stores a high-resolution mosaic; render a tight crop around its perspective.
crea_rect=[535,587,851,733]
crea_caption={'pt':'Renderização do ambiente de trabalho proposto para o Setor de Fiscalização do CREA-RJ, via Kingline Engenharia.','en':'Rendering of the proposed CREA-RJ Inspection Department workspace, via Kingline Engenharia.'}
im=clip(39,crea_rect,1800)
for name in ['cover-crea','hero-crea']:
 data=save(im,name,39,crea_caption,'rendered-crop',crea_rect)
projects['crea']['cover']='/assets/cover-crea.webp';projects['crea']['coverCaption']=crea_caption
# Portrait is cropped only to remove surrounding text, without changing the person.
portrait=embedded(28).crop((73,110,355,609))
save(portrait,'portrait-renata',2,{'pt':'Retrato de Renata Guimarães.','en':'Portrait of Renata Guimarães.'},'embedded-crop',[73,110,355,609])
save(embedded(183),'hero-ambrosini',10,{'pt':'Renderização da sala de estar e jantar integradas da Residência Ambrosini.','en':'Rendering of the open-plan living and dining room in the Ambrosini Residence.'})
# Additional full, unaltered photographs and renders for project galleries.
extras=[('ambrosini-kitchen',184,10),('ambrosini-gourmet',185,10),('ambrosini-patio',186,10),('r2s-meeting',766,23),('r2s-circulation',767,23),('mag-exterior',1064,37),('mag-interior',1065,37),('mag-hall',1066,37)]
for name,xref,num in extras:
 save(embedded(xref),name,num,{'pt':f'Imagem original do portfólio — página {num}.','en':f'Original portfolio image — page {num}.'})
if SOURCE != (OUT/'portfolio-renata-guimaraes.pdf').resolve():
 shutil.copy2(SOURCE,OUT/'portfolio-renata-guimaraes.pdf')
(OUT/'assets-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({k:{'width':v['width'],'height':v['height'],'KB':round(v['bytes']/1024,1)} for k,v in manifest['images'].items() if not k.startswith(('page-','thumb-'))},ensure_ascii=False,indent=2))
print('Asset total MB:',round(sum(p.stat().st_size for p in OUT.iterdir())/1024/1024,2))
