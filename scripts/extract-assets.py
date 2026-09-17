from pathlib import Path
import fitz, io, json, shutil
from PIL import Image,ImageOps,ImageDraw
import argparse
parser=argparse.ArgumentParser(description='Reextract assets from the exact original 40-page portfolio. Image references are specific to this PDF.')
parser.add_argument('pdf', type=Path)
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1]/'public/assets')
parser.add_argument('--galleries-output', type=Path, default=Path(__file__).resolve().parents[1]/'src/galleries.json')
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
 # Flatten an embedded transparency mask onto white, just as it appears on the page.
 pix=fitz.Pixmap(doc,xref)
 mask_type,mask_value=doc.xref_get_key(xref,'SMask')
 if mask_type=='xref':
  pix=fitz.Pixmap(pix,fitz.Pixmap(doc,int(mask_value.split()[0])))
 im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')
 paper=Image.new('RGBA',im.size,'white');paper.alpha_composite(im)
 return paper.convert('RGB')
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
# Selected, individually presented project images. Every rectangle below is a
# documentary extraction of an existing panel; no pixels are invented or enlarged.
# Crops use embedded-image pixels; CREA uses PDF points because its high-resolution
# source is tiled across multiple embedded images.
selections=[
 ('brito-living',99,6,'render',None,
  'Estar e jantar integrados, com mobiliário claro e iluminação no forro — renderização.',
  'Open-plan living and dining area with light furniture and ceiling lighting — rendering.'),
 ('brito-staircase',101,6,'render',None,
  'Sala de estar e escada com degraus em balanço — renderização.',
  'Living room and cantilevered staircase — rendering.'),
 ('brito-facade',102,6,'render',None,
  'Fachada com varanda envidraçada e revestimento geométrico — renderização.',
  'Façade with a glazed balcony and geometric wall cladding — rendering.'),
 ('cool-lounge',267,15,'photo',None,
  'Fotografia do salão, com estações de atendimento, mesa de sinuca e tijolos aparentes.',
  'Photograph of the interior, with barber stations, a pool table and exposed brickwork.'),
 ('cool-bar',268,15,'photo',None,
  'Fotografia da área de convivência, com mesa de sinuca e balcão de bar.',
  'Photograph of the lounge area with a pool table and bar counter.'),
 ('cool-retail',270,15,'photo',None,
  'Fotografia da área de exposição de roupas integrada à barbearia.',
  'Photograph of the clothing display integrated into the barbershop.'),
 ('pastore-entrance',336,18,'render',[194,938,875,1164],
  'Vista frontal do acesso à clínica e do balcão de recepção — renderização.',
  'Front view of the clinic entrance and reception desk — rendering.'),
 ('pastore-signage',336,18,'render',[919,773,1374,1165],
  'Perspectiva da entrada com a identificação do Centro Médico Pastore — renderização.',
  'Entrance perspective with Centro Médico Pastore signage — rendering.'),
 ('na-regua-layout',905,29,'drawing',None,
  'Planta de layout, corte e detalhes de instalações da proposta habitacional — Na Régua.',
  'Layout plan, section and building-services details for the housing proposal — Na Régua.'),
 ('na-regua-installations',915,30,'drawing',None,
  'Plantas de instalações elétricas e hidrossanitárias da residência — Na Régua.',
  'Electrical and plumbing plans for the home — Na Régua.'),
 ('krauzer-elevations',985,33,'drawing',None,
  'Elevações das quatro fachadas da Residência Krauzer — Huber Architecture.',
  'Elevations of the four façades of the Krauzer Residence — Huber Architecture.'),
 ('krauzer-sections',984,33,'drawing',None,
  'Cortes da residência e detalhe de parede — Huber Architecture.',
  'Building sections and wall detail — Huber Architecture.'),
 ('stark-layout',1009,34,'drawing',[90,215,450,680],
  'Planta da opção 4: integração de estar, cozinha e área de dormir — Huber Architecture.',
  'Option 4 floor plan: combined living, kitchen and sleeping areas — Huber Architecture.'),
 ('stark-model',1009,34,'render',[530,210,875,695],
  'Vista superior do modelo 3D da opção 4 — Huber Architecture.',
  'Top view of the option 4 model — Huber Architecture.'),
 ('ambrosini-kitchen',184,10,'render',None,
  'Cozinha com ilha, marcenaria azul e revestimento geométrico — renderização.',
  'Kitchen with an island, blue cabinetry and geometric wall tiles — rendering.'),
 ('ambrosini-gourmet',185,10,'render',None,
  'Área gourmet com bancada, churrasqueira e cobertura de madeira — renderização.',
  'Outdoor entertaining area with a counter, barbecue and timber ceiling — rendering.'),
 ('ambrosini-patio',186,10,'render',None,
  'Pátio com assentos suspensos, madeira e vegetação — renderização.',
  'Patio with hanging seats, timber finishes and planting — rendering.'),
 ('r2s-meeting',766,23,'render',None,
  'Estações de trabalho em ambiente compartilhado, com divisórias de vidro — renderização.',
  'Shared workspace with workstations and glazed partitions — rendering.'),
 ('r2s-circulation',767,23,'render',None,
  'Circulação do mezanino com área de espera e vista para o pavimento inferior — renderização.',
  'Mezzanine circulation and seating overlooking the floor below — rendering.'),
 ('mag-exterior',1064,37,'render',None,
  'Vista externa do museu com cobertura ondulada e acesso envidraçado — renderização.',
  'Exterior view of the museum with its undulating roof and glazed entrance — rendering.'),
 ('mag-interior',1065,37,'render',None,
  'Circulação interna junto à fachada envidraçada, com vista para a água — renderização.',
  'Interior circulation beside the glazed façade overlooking the water — rendering.'),
 ('mag-hall',1066,37,'render',None,
  'Espaço interno de convivência sob a estrutura curva da cobertura — renderização.',
  'Indoor gathering space beneath the curved roof structure — rendering.'),
]
for name,xref,num,kind,crop,pt,en in selections:
 im=embedded(xref)
 if crop:im=im.crop(crop)
 data=save(im,name,num,{'pt':pt,'en':en},'embedded-crop' if crop else 'embedded')
 data['sourceXref']=xref;data['mediaType']=kind
 if crop:data['sourceCropPixels']=crop
 if name.startswith(('krauzer-','stark-')):data['credit']='Huber Architecture'

crea_selections=[
 ('crea-workspace', [886,587,1072,739], 1100, 'render',
  'Estações de trabalho junto às janelas do Setor de Fiscalização — renderização, via Kingline Engenharia.',
  'Workstations beside the Inspection Department windows — rendering, via Kingline Engenharia.'),
 ('crea-model', [925,374,1155,572], 1500, 'render',
  'Vista 3D da distribuição das salas e estações de trabalho — via Kingline Engenharia.',
  '3D view of the room layout and workstations — via Kingline Engenharia.'),
 ('crea-layout', [466,81,713,346], 1600, 'drawing',
  'Planta de layout com setores de trabalho, salas de reunião e circulação — via Kingline Engenharia.',
  'Layout plan showing work areas, meeting rooms and circulation — via Kingline Engenharia.'),
]
for name,rect,width,kind,pt,en in crea_selections:
 data=save(clip(39,rect,width),name,39,{'pt':pt,'en':en},'rendered-crop',rect)
 data['mediaType']=kind;data['credit']='Renata Guimarães · Kingline Engenharia'

for slug in projects:
 key='cover-'+slug
 manifest['images'][key]['mediaType']='drawing' if slug in ('na-regua','krauzer','stark') else ('photo' if slug=='cool' else 'render')
for slug in ['krauzer','stark']:manifest['images']['cover-'+slug]['credit']='Huber Architecture'
manifest['images']['cover-cool']['caption']={'pt':'Fotografia do interior da Cool Barber Shop, com tijolos aparentes, mobiliário escuro e iluminação quente.','en':'Photograph of the Cool Barber Shop interior with exposed brick, dark furniture and warm lighting.'}
projects['cool']['coverCaption']=manifest['images']['cover-cool']['caption']
manifest['images']['hero-ambrosini']['mediaType']='render'
manifest['images']['hero-crea']['mediaType']='render'

galleries={
 'brito':['cover-brito','brito-living','brito-staircase','brito-facade'],
 'ambrosini':['hero-ambrosini','ambrosini-kitchen','ambrosini-gourmet','ambrosini-patio'],
 'cool-barber':['cover-cool','cool-lounge','cool-bar','cool-retail'],
 'pastore':['cover-pastore','pastore-entrance','pastore-signage'],
 'r2s-med':['cover-r2s','r2s-meeting','r2s-circulation'],
 'na-regua':['cover-na-regua','na-regua-layout','na-regua-installations'],
 'krauzer':['cover-krauzer','krauzer-elevations','krauzer-sections'],
 'stark':['cover-stark','stark-layout','stark-model'],
 'mag':['cover-mag','mag-exterior','mag-interior','mag-hall'],
 'crea-rj':['cover-crea','crea-workspace','crea-model','crea-layout'],
}
args.galleries_output.parent.mkdir(parents=True,exist_ok=True)
args.galleries_output.write_text(json.dumps(galleries,ensure_ascii=False,indent=2)+'\n')
if SOURCE != (OUT/'portfolio-renata-guimaraes.pdf').resolve():
 shutil.copy2(SOURCE,OUT/'portfolio-renata-guimaraes.pdf')
(OUT/'assets-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({k:{'width':v['width'],'height':v['height'],'KB':round(v['bytes']/1024,1)} for k,v in manifest['images'].items() if not k.startswith(('page-','thumb-'))},ensure_ascii=False,indent=2))
print('Asset total MB:',round(sum(p.stat().st_size for p in OUT.iterdir())/1024/1024,2))
