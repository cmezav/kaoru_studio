const env=(value)=>({color:value[0],intensity:value[1]});
const dl=(value)=>({color:value[0],intensity:value[1],azimuth:value[2],elevation:value[3],distance:value[5]??5.4,softness:value[4]});

const EXTRA_PRESET_TAGS={
  'ref-diafana-base':['natural'],
  'ref-cenital-calida':['natural','dramatic'],
  'ref-lateral-complementaria':['color','dramatic'],
  'ref-causticas-inferiores':['pattern','fantasy','color'],
  'ref-frontal-neutra':['natural'],
  'ref-lateral-derecha-difusa':['natural'],
  'ref-follaje-dappled':['natural','pattern','dramatic'],
  'ref-nocturno-escotopico':['color','dramatic'],
  'ref-golden-hour-rasante':['natural','dramatic'],
  'ref-halo-retro':['color','dramatic','fantasy'],
  'ref-division-lineal':['pattern','dramatic','color'],
  'ref-sombras-intersectantes':['pattern','dramatic'],
  'ref-local-plana':['natural'],
  'ref-frontal-superior-calida':['natural'],
  'ref-underlight-cobrizo':['dramatic','color'],
  'ref-top-light-dura':['natural','dramatic'],
  'ref-banda-sombra-transversal':['pattern','dramatic'],
  'ref-rim-cian-sombra-calida':['color','dramatic'],
  'ref-moteado-dorado':['pattern','natural','dramatic'],
  'ref-cian-rebote-inferior':['color','dramatic'],
  'ref-synthwave-bilateral':['color','dramatic','fantasy'],
  'ref-division-diagonal':['pattern','dramatic'],
  'ref-mapa-grisaceo':['natural'],
  'ref-dia-nublado-extremo':['natural'],
  'ref-flash-frontal':['dramatic'],
  'ref-submarina-caustica':['pattern','fantasy','color'],
  'ref-cenital-solar-alto':['natural','dramatic'],
  'ref-retro-calida-masiva':['dramatic','color'],
  'ref-blacklight-emisivo':['fantasy','color','dramatic','pattern'],
  'ref-split-yellow-blue':['color','dramatic'],
  'ref-subiluminacion-invertida':['color','dramatic'],
  'ref-lateral-cortante-calida':['natural','dramatic'],
  'ref-abisal-frio':['color','dramatic'],
  'ref-moteado-organico-suave':['pattern','natural'],
  'ref-plano-teal-beige':['natural'],
  'ref-flash-frio':['dramatic','color'],
  'ref-rejilla-inclinada':['pattern','dramatic'],
  'ref-luz-45-estandar':['natural'],
  'ref-rim-fill-complementario':['color','dramatic'],
  'ref-midday-lima':['natural','dramatic'],
  'ref-division-oblicua':['color','dramatic','pattern'],
  'ref-doble-rim-neon':['color','dramatic','fantasy'],
  'ref-malla-ortogonal':['pattern','dramatic'],
  'ref-dispersion-espectral':['fantasy','color','pattern'],
  'ref-prisma-real':['fantasy','color','pattern'],
  'ref-recorte-acuatico-multiple':['fantasy','color','pattern','dramatic']
};

function extraPresetTags(id,c={}){
  const tags=new Set(EXTRA_PRESET_TAGS[id]||[]);
  const type=c.effect?.type||'none';

  if([
    'stripe','window','leaves','blinds',
    'bokeh','circles','sparkles','grid','blacklight',
    'underwater','caustics'
  ].includes(type)){
    tags.add('pattern');
  }

  if([
    'iridescent','rainbow',
    'underwater','caustics',
    'sparkles','bokeh','circles','blacklight'
  ].includes(type)){
    tags.add('fantasy');
  }

  if([
    'split','neon',
    'iridescent','rainbow','blacklight'
  ].includes(type)){
    tags.add('color');
  }

  return [...tags];
}

const mk=(id,name,description,c={})=>({
  id,group:'creative',tags:extraPresetTags(id,c),name,description,
  scene:{background:c.background||'#2A2630',fog:c.fog||c.background||'#2A2630',floor:c.floor||'#242127',exposure:c.exposure??1,weather:'clear',...(c.effect?{effect:c.effect}:{})},
  lighting:{
    ambient:env(c.ambient||['#777777',20]),shadow:env(c.shadow||['#202020',45]),bounce:env(c.bounce||['#555555',12]),rim:env(c.rim||['#FFFFFF',10]),
    key:dl(c.key||['#FFFFFF',70,0,45,50]),fill:dl(c.fill||['#888888',20,160,20,80]),...(c.extra?{extra:c.extra}:{})
  }
});

export const EXTRA_LIGHTING_ATMOSPHERES=[
  mk('ref-diafana-base','Luz Base Diáfana','Global difusa, color local puro y sombras lavanda mínimas',{background:'#E8E6E7',floor:'#D9D6D8',exposure:1.08,ambient:['#F2F0F1',46],shadow:['#CFC5DE',8],bounce:['#EEE9E6',28],rim:['#FFFFFF',4],key:['#FFFFFF',30,0,70,96],fill:['#ECEAF2',24,180,35,98]}),
  mk('ref-cenital-calida','Cenital Direccional Cálida','Top light melocotón/ámbar con sombra violeta-magenta dura',{background:'#5C4B5C',floor:'#5A474A',ambient:['#7B627A',14],shadow:['#60405E',68],bounce:['#B66F58',12],rim:['#FFD5B4',8],key:['#FFC083',112,0,90,8],fill:['#765675',10,180,10,90]}),
  mk('ref-lateral-complementaria','Contraste Lateral Complementario','Rim amarillo cadmio desde abajo-izquierda sobre masa azul cobalto',{background:'#081B43',floor:'#08152F',exposure:.82,ambient:['#123B8A',28],shadow:['#04102C',82],bounce:['#174C9B',16],rim:['#FFD51A',68],key:['#FFD21A',132,-135,-18,10],fill:['#174D9F',32,55,18,74],effect:{type:'split',colorA:'#FFD21A',colorB:'#123D91',opacity:56,angle:-28,scale:135,blur:8,contrast:94,density:45}}),
  mk('ref-causticas-inferiores','Caústicas Inferiores','Ambiente cian oscuro con rebote turquesa fluorescente ondulante desde la base',{background:'#062B37',floor:'#06343A',exposure:.90,ambient:['#0B4D60',22],shadow:['#031D2A',60],bounce:['#2FFFC8',58],rim:['#64F7E0',24],key:['#35FFD0',102,0,-58,18],fill:['#0B647A',24,160,20,78],effect:{type:'caustics',colorA:'#35FFD0',colorB:'#16D8C5',opacity:92,angle:90,scale:104,blur:3,offsetY:34,contrast:100,density:86}}),
  mk('ref-frontal-neutra','Frontal Neutra','Iluminación frontal uniforme con gradientes grises cálidos suaves',{background:'#E7DDD5',floor:'#D9CFC7',ambient:['#EEE8E2',38],shadow:['#B9ADA5',14],bounce:['#E6CAB8',24],rim:['#FFF8F0',6],key:['#FFF2E8',58,0,8,90],fill:['#D8D0CF',24,180,16,94]}),
  mk('ref-lateral-derecha-difusa','Lateral Derecha Difusa','Luz 3–4 en punto con terminador muy suave hacia lavanda gris',{background:'#AAA3B2',floor:'#8F8994',ambient:['#B9B0C2',24],shadow:['#8B819A',28],bounce:['#CDAF9A',18],rim:['#F4E4D8',8],key:['#F2D2B9',76,62,28,92],fill:['#A99DBB',20,-72,20,96]}),
  mk('ref-follaje-dappled','Moteado de Follaje (Dappled)','Base salvia/oliva con parches duros de luz amarillo dorado',{background:'#59634B',floor:'#4B523F',exposure:.98,ambient:['#73805F',24],shadow:['#465038',54],bounce:['#7B7E50',14],rim:['#F3DB76',16],key:['#FFD96A',112,-38,62,10],fill:['#718064',22,68,20,82],effect:{type:'leaves',colorA:'#FFE06C',colorB:'#C3922E',opacity:82,angle:-24,scale:106,blur:1,contrast:100,density:70}}),
  mk('ref-nocturno-escotopico','Baño Escotópico (Nocturno)','Monocromatismo azul de bajo contraste con oquedades índigo',{background:'#071936',floor:'#0A1730',exposure:.74,ambient:['#34577B',28],shadow:['#111C4A',66],bounce:['#203C63',10],rim:['#6687AA',8],key:['#5F81A6',44,0,68,88],fill:['#1A3260',18,160,18,92]}),
  mk('ref-golden-hour-rasante','Ángulo Rasante Cálido (Golden Hour)','Luz mandarina saturada izquierda con sombras terracota/cobre',{background:'#633727',floor:'#5B342A',exposure:1.06,ambient:['#8B594A',20],shadow:['#58291F',64],bounce:['#C96932',30],rim:['#FFB34A',28],key:['#FF7A20',126,-90,8,14],fill:['#8B4F48',14,78,12,86],effect:{type:'rim',colorA:'#FF7A20',colorB:'#A84427',opacity:38,angle:-90,scale:120,blur:8,contrast:88,density:48}}),
  mk('ref-halo-retro','Retroiluminación Envolvente (Halo)','Contraluz blanco perlado con rebote frontal rosa orquídea/magenta',{background:'#4A2B4F',floor:'#3C243F',exposure:1.03,ambient:['#B96DB4',22],shadow:['#4A2B4B',58],bounce:['#F08AD8',40],rim:['#FFF8F5',100],key:['#FFF9EE',128,180,32,12],fill:['#DB75C2',42,0,14,72],effect:{type:'rim',colorA:'#FFFFFF',colorB:'#E98BD6',opacity:78,angle:180,scale:120,blur:7,contrast:96,density:54}}),
  mk('ref-division-lineal','División Lineal Ortogonal','Púrpura profundo cortado por banda vertical fina amarillo limón',{background:'#13071F',floor:'#0F0718',exposure:.82,ambient:['#301047',14],shadow:['#09030F',88],bounce:['#45145F',6],rim:['#F4FF5C',10],key:['#F4FF48',136,0,18,2],fill:['#351047',10,180,12,94],effect:{type:'stripe',colorA:'#F6FF36',colorB:'#F6FF36',opacity:96,angle:0,scale:38,blur:0,contrast:100,density:50}}),
  mk('ref-sombras-intersectantes','Sombras Intersectantes','Luz cálida suave interrumpida por bandas oscuras ortogonales gruesas',{background:'#8F6653',floor:'#6B483D',exposure:.98,ambient:['#A77A65',22],shadow:['#542620',68],bounce:['#C48865',16],rim:['#E6B799',8],key:['#F4C49A',90,-25,48,56],fill:['#8C635E',14,110,18,86],effect:{type:'window',colorA:'#F4C99F',colorB:'#54261F',opacity:84,angle:0,scale:138,blur:0,contrast:100,density:78}}),
  mk('ref-local-plana','Local Plana','Color base plano sin contraste volumétrico',{background:'#8A8468',floor:'#77715A',exposure:.94,ambient:['#A39D7E',44],shadow:['#817A64',4],bounce:['#A49B79',30],rim:['#A8A08A',2],key:['#B5AE91',8,0,70,100],fill:['#999379',8,180,30,100]}),
  mk('ref-frontal-superior-calida','Difusa Frontal-Superior Cálida','Baño salmón/rosa empolvado y sombras lila apenas sugeridas',{background:'#C69DA2',floor:'#B48F90',ambient:['#D7ADB0',38],shadow:['#B79EBB',12],bounce:['#DCA38F',26],rim:['#F1C8C2',5],key:['#F1B0A0',54,-10,55,96],fill:['#C5A5C2',28,150,24,98]}),
  mk('ref-underlight-cobrizo','Underlighting Direccional (Luz Inferior)','Luz naranja cobrizo desde abajo con sombras arriba en ambiente gris frío',{background:'#30333B',floor:'#392A27',exposure:.92,ambient:['#515765',18],shadow:['#272D39',62],bounce:['#D65A22',42],rim:['#FF8E3C',18],key:['#F46D28',118,0,-75,14],fill:['#526175',16,180,40,84]}),
  mk('ref-top-light-dura','Luz Cenital Dura (Top Light)','Top light vertical duro con sombras siena afiladas',{background:'#806A58',floor:'#6A5546',ambient:['#9A806E',16],shadow:['#4D2B1B',76],bounce:['#9C643D',10],rim:['#E8C9A6',6],key:['#FFE0AF',128,0,90,2],fill:['#856B60',8,180,10,94]}),
  mk('ref-banda-sombra-transversal','Banda de Sombra Transversal','Luz naranja pastel lateral y franja horizontal de sombra dura',{background:'#9B755C',floor:'#7D624D',ambient:['#B28C72',24],shadow:['#5A4A2D',58],bounce:['#C58E65',16],rim:['#F3B985',8],key:['#F6B77C',92,62,24,38],fill:['#8C725D',14,-75,18,86],effect:{type:'stripe',colorA:'#5C4A2B',colorB:'#5C4A2B',opacity:74,angle:90,scale:102,blur:1,offsetY:-18,contrast:98,density:42}}),
  mk('ref-rim-cian-sombra-calida','Recorte Cian sobre Sombra Cálida','Penumbra borgoña con línea cian eléctrica en el borde izquierdo',{background:'#38171F',floor:'#2B1218',exposure:.83,ambient:['#57232D',20],shadow:['#250D13',78],bounce:['#71312C',14],rim:['#16EFFF',100],key:['#16EFFF',132,-98,14,4],fill:['#662631',14,62,18,90],effect:{type:'rim',colorA:'#00EFFF',colorB:'#6A2630',opacity:86,angle:-90,scale:94,blur:2,contrast:100,density:44}}),
  mk('ref-moteado-dorado','Moteado Dorado Intenso','Base siena/ámbar con parches amarillos duros y fragmentados',{background:'#76502C',floor:'#5F3E25',ambient:['#936437',26],shadow:['#633D22',56],bounce:['#BC7834',22],rim:['#FFE171',14],key:['#FFE36A',112,-36,58,10],fill:['#8D5A30',18,76,18,84],effect:{type:'leaves',colorA:'#FFE56A',colorB:'#F0A52A',opacity:82,angle:-18,scale:92,blur:1,contrast:100,density:78}}),
  mk('ref-cian-rebote-inferior','Ambiente Cían vs Rebote Inferior','Sombra azul pizarra arriba y potente cian/turquesa desde frente-abajo',{background:'#1B3146',floor:'#163A43',exposure:.90,ambient:['#31526C',22],shadow:['#102538',68],bounce:['#67F4E5',62],rim:['#78EEDD',24],key:['#73F5E6',122,0,-50,18],fill:['#2B4864',18,170,30,88],effect:{type:'underwater',colorA:'#78F7E4',colorB:'#41BFC6',opacity:70,angle:90,scale:118,blur:10,offsetY:34,contrast:86,density:58}}),
  mk('ref-synthwave-bilateral','Esquema Bi-Lateral Complementario (Synthwave)','Azul aciano derecha y magenta izquierda con valle lila central',{background:'#170A28',floor:'#10091B',exposure:.86,ambient:['#3B1E54',14],shadow:['#170921',78],bounce:['#5B286F',10],rim:['#6FA9FF',30],key:['#FF3EBC',126,-90,22,10],fill:['#5398FF',126,90,22,10],effect:{type:'neon',colorA:'#FF39C5',colorB:'#4C9CFF',opacity:88,angle:0,scale:120,blur:4,contrast:100,density:54}}),
  mk('ref-division-diagonal','División Diagonal Triangulada','Haz dorado diagonal sobre sombra azul grisácea uniforme',{background:'#667381',floor:'#56616C',ambient:['#81909D',26],shadow:['#55626F',44],bounce:['#9B8B65',10],rim:['#EEDB9D',8],key:['#FFE5A6',94,-42,34,12],fill:['#708292',20,135,22,88],effect:{type:'stripe',colorA:'#FFE3A0',colorB:'#FFE3A0',opacity:76,angle:-42,scale:180,blur:0,contrast:100,density:34}}),
  mk('ref-mapa-grisaceo','Mapa Base Grisáceo','Sepias y grises cálidos planos sin direccionalidad',{background:'#756D66',floor:'#625C57',exposure:.88,ambient:['#8A8179',38],shadow:['#49443F',16],bounce:['#82766B',24],rim:['#9B928B',3],key:['#9A9188',12,0,65,100],fill:['#7E7772',12,180,25,100]}),
  mk('ref-dia-nublado-extremo','Omisión Direccional (Día Nublado)','Luz blanca/gris perla hiper-difusa sin sombras proyectadas',{background:'#D4D7D9',floor:'#C6C9C9',exposure:1.08,ambient:['#E4E6E7',48],shadow:['#AEB4B8',6],bounce:['#D9DADB',34],rim:['#F2F3F3',3],key:['#F7F7F5',24,0,70,100],fill:['#D9DDE0',26,180,34,100]}),
  mk('ref-flash-frontal','Flash Frontal Concentrado','Foco frontal blanco pequeño, duro y especular con oclusión periférica',{background:'#55555A',floor:'#48484C',exposure:1.05,ambient:['#69696F',16],shadow:['#2D2D33',62],bounce:['#77777A',8],rim:['#BEBEC2',8],key:['#FFFFFF',138,0,2,4],fill:['#777A83',10,180,20,94],effect:{type:'flash',colorA:'#FFFFFF',colorB:'#B8B8C0',opacity:66,angle:0,scale:60,blur:2,contrast:100,density:44}}),
  mk('ref-submarina-caustica','Inmersión Submarina Caústica','Azul medianoche con caústicas esmeralda/cian en planos frontales e inferiores',{background:'#021126',floor:'#03273A',exposure:.80,ambient:['#08365F',20],shadow:['#01091A',76],bounce:['#15D7B2',48],rim:['#51E5EE',24],key:['#32E3C0',96,0,-34,18],fill:['#116F8E',26,150,20,74],effect:{type:'caustics',colorA:'#20F0B2',colorB:'#16D8ED',opacity:94,angle:78,scale:104,blur:3,offsetY:26,contrast:100,density:94}}),
  mk('ref-cenital-solar-alto','Cenital de Alto Contraste Solar','Top light sobreexpuesto, sombras negras y rebote ocre inferior',{background:'#8A7250',floor:'#8B6A32',exposure:1.14,ambient:['#A38B62',12],shadow:['#17120C',88],bounce:['#E5B34D',46],rim:['#FFF2B0',8],key:['#FFF3B2',146,0,90,2],fill:['#D39A35',24,180,-35,42]}),
  mk('ref-retro-calida-masiva','Retroiluminación Masiva Cálida','Contraluz naranja fuego/escarlata y frente gris-azulado tenue',{background:'#241B24',floor:'#20181B',exposure:.94,ambient:['#465367',18],shadow:['#191923',70],bounce:['#654341',12],rim:['#FF5A20',86],key:['#FF5B1F',142,180,22,14],fill:['#586779',22,0,15,86],effect:{type:'rim',colorA:'#FF5A1A',colorB:'#E52F25',opacity:82,angle:180,scale:135,blur:10,contrast:96,density:55}}),
  mk('ref-blacklight-emisivo','Emisividad Luminiscente (Blacklight)','Base negra con patrones fosforescentes fucsia, naranja neón y cian',{background:'#000000',floor:'#010103',exposure:.68,ambient:['#000000',0],shadow:['#000000',98],bounce:['#070711',1],rim:['#15F4EE',34],key:['#FF28C8',92,-65,24,14],fill:['#12E8FF',88,70,18,14],effect:{type:'blacklight',colorA:'#FF24C8',colorB:'#19F6FF',opacity:96,angle:0,scale:110,blur:2,contrast:100,density:78},extra:[{id:'blacklight-orange',name:'Neón naranja',color:'#FF6A00',intensity:78,azimuth:175,elevation:8,distance:5.6,softness:16}]}),
  mk('ref-split-yellow-blue','División Extrema (High-Key Yellow / Low-Key Blue)','Franja mínima amarilla cromo frente a masa azul cobalto/marino',{background:'#06163C',floor:'#05112E',exposure:.76,ambient:['#0F327A',22],shadow:['#020C26',90],bounce:['#102C68',6],rim:['#FFE322',30],key:['#FFE521',156,-98,16,1],fill:['#123B92',38,62,18,70],effect:{type:'split',colorA:'#FFE41C',colorB:'#08286C',opacity:96,angle:0,scale:78,blur:0,offsetX:-44,contrast:100,density:50}}),
  mk('ref-subiluminacion-invertida','Subiluminación Térmica Invertida','Ambiente azul real con luz inferior amarillo limón y franja verde manzana',{background:'#0D2E9A',floor:'#132866',exposure:.90,ambient:['#1745B8',28],shadow:['#071850',72],bounce:['#F7F128',58],rim:['#7BCF36',22],key:['#FFF22B',136,0,-54,10],fill:['#2454C8',30,170,22,78],effect:{type:'split',colorA:'#FFF12A',colorB:'#1740AE',opacity:78,angle:90,scale:118,blur:4,offsetY:30,contrast:94,density:48}}),
  mk('ref-lateral-cortante-calida','Lateral Cortante Cálida','Luz rasante ámbar izquierda-inferior con sombras caoba/siena',{background:'#5B352A',floor:'#4C2D25',ambient:['#724536',16],shadow:['#3C1F18',74],bounce:['#A85D2F',20],rim:['#E99C49',18],key:['#D98536',122,-105,-10,6],fill:['#6D4035',12,65,14,90],effect:{type:'rim',colorA:'#DE8B39',colorB:'#8A3E27',opacity:44,angle:-105,scale:120,blur:3,contrast:96,density:40}}),
  mk('ref-abisal-frio','Caída Acuática Abisal','Luz celeste/aguamarina superior-derecha sobre sombra teal densa',{background:'#062F39',floor:'#05262D',exposure:.82,ambient:['#0B4D58',24],shadow:['#032229',72],bounce:['#0D6772',14],rim:['#77E8F4',20],key:['#87E7F5',88,48,68,34],fill:['#0A5660',20,-72,16,84],effect:{type:'underwater',colorA:'#82E9F4',colorB:'#19A9A8',opacity:34,angle:32,scale:138,blur:22,contrast:68,density:46}}),
  mk('ref-moteado-organico-suave','Moteado Orgánico con Bordes Difusos','Parches amarillo pálido sobre base marrón/rojiza con penumbra suave',{background:'#704438',floor:'#5E3930',ambient:['#85584A',24],shadow:['#58362F',48],bounce:['#A06B49',18],rim:['#E6C984',10],key:['#F5DA8A',86,-34,52,62],fill:['#815A4D',18,72,20,88],effect:{type:'leaves',colorA:'#F6DB8C',colorB:'#D8B26B',opacity:62,angle:-14,scale:132,blur:28,contrast:62,density:52}}),
  mk('ref-plano-teal-beige','Render Plano Teal/Beige','Color local brillante y luz diáfana sin oclusiones oscuras',{background:'#A9B8A9',floor:'#AAA88F',exposure:1.04,ambient:['#C2C6B4',42],shadow:['#919B90',7],bounce:['#CDBF9F',30],rim:['#D9E4D6',4],key:['#E3DDC6',20,0,68,100],fill:['#A9C2BB',20,180,28,100]}),
  mk('ref-flash-frio','Flash Frío Aplanador','Flash frontal neutro/frío con especular blanco y bordes gris azulados',{background:'#596674',floor:'#4B5662',ambient:['#748696',20],shadow:['#394B5F',54],bounce:['#718898',12],rim:['#DCEEFF',10],key:['#F4FBFF',132,0,4,4],fill:['#65809A',16,180,20,90],effect:{type:'flash',colorA:'#FFFFFF',colorB:'#A6C9E5',opacity:58,angle:0,scale:74,blur:4,contrast:94,density:42}}),
  mk('ref-rejilla-inclinada','Rejilla Lineal Inclinada','Bandas diagonales granate con rayas estrechas naranja pálido/rosa viejo',{background:'#6F3E43',floor:'#59343A',exposure:.94,ambient:['#84505A',22],shadow:['#4B1F2B',68],bounce:['#A46555',14],rim:['#EAB29E',8],key:['#E9AC8D',82,-38,42,20],fill:['#754957',16,120,18,86],effect:{type:'blinds',colorA:'#E9A585',colorB:'#5B2332',opacity:76,angle:-34,scale:105,blur:1,contrast:98,density:76}}),
  mk('ref-luz-45-estandar','Ángulo de 45° Estándar','Luz neutro-cálida superior-izquierda con sombra suave hacia la derecha',{background:'#8F8278',floor:'#766B64',ambient:['#A99B90',22],shadow:['#665852',40],bounce:['#AE8267',16],rim:['#E0CDBE',8],key:['#E8C6A7',88,-45,45,62],fill:['#9A8D8C',22,135,18,86]}),
  mk('ref-rim-fill-complementario','Contraste Tonal Complementario (Rim+Fill)','Rim coral arriba-izquierda y relleno violeta/lila fuerte',{background:'#4A2F63',floor:'#39254E',exposure:.94,ambient:['#7550A0',28],shadow:['#342146',62],bounce:['#8759A6',18],rim:['#FF725E',62],key:['#FF745E',118,-52,62,12],fill:['#8657C5',46,70,20,68],effect:{type:'split',colorA:'#FF725E',colorB:'#8B5AC7',opacity:46,angle:-34,scale:134,blur:14,contrast:82,density:48}}),
  mk('ref-midday-lima','Cenital Extrema (Midday Sun)','Top light lima/amarillo verdoso con sombras oliva cortantes',{background:'#727A42',floor:'#60683A',ambient:['#879153',16],shadow:['#354019',76],bounce:['#909B45',14],rim:['#D9E97A',6],key:['#E6F27A',128,0,90,2],fill:['#69743E',10,180,8,94]}),
  mk('ref-division-oblicua','División Oblicua de Dos Ambientes','Corte diagonal entre sombra oliva y luz ocre/dorada',{background:'#596043',floor:'#4D503A',ambient:['#69704C',24],shadow:['#454B35',48],bounce:['#A08245',20],rim:['#DDBA67',10],key:['#D6A84D',92,-42,34,22],fill:['#66724F',24,140,20,82],effect:{type:'split',colorA:'#68764E',colorB:'#D3A44A',opacity:66,angle:-42,scale:132,blur:1,contrast:96,density:44}}),
  mk('ref-doble-rim-neon','Doble Recorte Neón sobre Negro','Núcleo casi negro con carmesí izquierda y cian derecha',{background:'#020204',floor:'#040406',exposure:.68,ambient:['#070709',3],shadow:['#000000',96],bounce:['#0C0C12',2],rim:['#16F0FF',42],key:['#FF2944',120,-90,20,4],fill:['#19EFFF',120,90,20,4],effect:{type:'neon',colorA:'#FF2341',colorB:'#17ECFF',opacity:98,angle:0,scale:118,blur:2,contrast:100,density:54}}),
  mk('ref-malla-ortogonal','Sombra de Malla Ortogonal','Cuadrícula ortogonal oscura muy nítida sobre luz amarilla cálida',{background:'#6B5433',floor:'#55432B',exposure:.96,ambient:['#826943',18],shadow:['#382E21',72],bounce:['#A88148',14],rim:['#E9CB78',8],key:['#F2CE70',104,-18,54,10],fill:['#746445',12,100,18,90],effect:{type:'grid',colorA:'#F4D276',colorB:'#3B3024',opacity:94,angle:0,scale:92,blur:0,contrast:100,density:82}}),
  mk('ref-dispersion-espectral','Frente con Dispersión Espectral','Frente magenta y fina banda prismática iridiscente en el terminador',{background:'#704868',floor:'#5B3B55',exposure:.98,ambient:['#956389',22],shadow:['#533348',56],bounce:['#A6746C',14],rim:['#E7A9D4',14],key:['#E69ACB',96,0,18,42],fill:['#8C5A77',18,170,18,88],effect:{type:'iridescent',colorA:'#FF4FA3',colorB:'#62E8FF',opacity:84,angle:-18,scale:54,blur:2,offsetX:18,contrast:100,density:44}}),
  mk('ref-prisma-real','Proyección Prisma (Arcoíris Real)','Banda diagonal concentrada de espectro rojo/amarillo/verde/cian sobre taupé gris',{background:'#716965',floor:'#5C5552',exposure:.96,ambient:['#817A76',22],shadow:['#514B48',52],bounce:['#81756A',10],rim:['#D8D0C9',6],key:['#FFFFFF',88,-38,34,12],fill:['#716B69',16,135,18,92],effect:{type:'rainbow',colorA:'#FF3A3A',colorB:'#28E7FF',opacity:98,angle:-38,scale:64,blur:1,contrast:100,density:56}}),
  mk('ref-recorte-acuatico-multiple','Múltiple Recorte Frío Acuático','Rim blanco-azul superior/izquierdo y caústicas aguamarina desde base derecha',{background:'#072B3D',floor:'#052D36',exposure:.90,ambient:['#13495E',22],shadow:['#04202D',70],bounce:['#23D9B5',38],rim:['#B8EDFF',58],key:['#C6F1FF',110,-48,62,14],fill:['#29E1B8',92,118,-28,20],effect:{type:'caustics',colorA:'#32F2C2',colorB:'#84E8F3',opacity:92,angle:55,scale:116,blur:3,offsetX:30,offsetY:26,contrast:100,density:88},extra:[{id:'aquatic-rim-extra',name:'Recorte azul extra',color:'#A7E9FF',intensity:68,azimuth:-112,elevation:34,distance:5.8,softness:16}]}),
];
