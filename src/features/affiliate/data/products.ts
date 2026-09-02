// ==========================================================
// CREDI MARKETPLACE
// Affiliate Partners Catalog
// Static Commercial Data
// ==========================================================


import type {
  AffiliateProduct,
} from '@/types/affiliate';



export const affiliateProducts:
readonly AffiliateProduct[] =
[

{
  id:'amazon',

  name:'Amazon Global',


  partner:{
    id:'amazon',
    name:'Amazon'
  },


  category:{
    es:'Tecnología & Hogar',
    en:'Tech & Home',
    pt:'Tecnologia & Casa',
    fr:'Technologie & Maison',
  },


  title:{
    es:'Amazon Global Store',
    en:'Amazon Global Store',
    pt:'Amazon Global Store',
    fr:'Amazon Global Store',
  },


  description:{
    es:'Compra internacional con acceso a productos disponibles en Amazon.',
    en:'International shopping through Amazon marketplace.',
    pt:'Compras internacionais através da Amazon.',
    fr:'Achats internationaux via Amazon.',
  },


  badge:'Amazon Partner',


  badgeVariant:'warning',


  icon:'fa-amazon',


  affiliateUrl:
  'https://amzn.to/4bJJq22',

  buttonText:{
    es:'Ver producto',
    en:'View product',
    pt:'Ver produto',
    fr:'Voir le produit',
  },



  tracking:{
    enabled:true,
    campaign:'amazon-global',
    source:'credi-marketplace'
  },


  availability:{
    active:true,
    countries:[
      'VE',
      'US',
      'ES'
    ]
  }

},



{
  id:'shein',

  name:'SHEIN Fashion',


  partner:{
    id:'shein',
    name:'SHEIN'
  },


  category:{
    es:'Moda & Tendencias',
    en:'Fashion & Trends',
    pt:'Moda & Tendências',
    fr:'Mode & Tendances',
  },


  title:{
    es:'SHEIN Global Fashion',
    en:'SHEIN Global Fashion',
    pt:'SHEIN Global Fashion',
    fr:'SHEIN Global Fashion',
  },


  description:{
    es:'Moda y accesorios internacionales.',
    en:'International fashion and accessories.',
    pt:'Moda e acessórios internacionais.',
    fr:'Mode et accessoires internationaux.',
  },


  badge:'SHEIN Partner',


  badgeVariant:'danger',


  icon:'fa-shirt',


  affiliateUrl:
  'https://onelink.shein.com/44/5wyleaujbj2iI',

  buttonText:{
    es:'Ver producto',
    en:'View product',
    pt:'Ver produto',
    fr:'Voir le produit',
  },


  tracking:{
    enabled:true,
    campaign:'shein-fashion',
    source:'credi-marketplace'
  },


  availability:{
    active:true
  }

}

] as const;
