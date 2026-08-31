"use client";


// ==========================================================
// ARCHIVO: src/context/LanguageContext.tsx
// Credi Marketplace
//
// Global Language Context
//
// Next.js 16
// React 19
// TypeScript
// i18n Ready
// ==========================================================


import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";


import {

  locales,

  defaultLocale,

  isLocale,

  type Locale,

  getLocaleConfig,

  type LocaleConfig,

} from "@/i18n/config";




// ==========================================================
// TIPOS
// ==========================================================

export interface LanguageContextValue {


  locale: Locale;


  localeConfig: LocaleConfig;


  availableLocales: readonly Locale[];


  setLocale(
    locale: Locale,
  ): void;



  changeLanguage(
    locale: Locale,
  ): void;


}





const LANGUAGE_STORAGE_KEY =
"credi-marketplace-locale";






const LanguageContext =
createContext<
LanguageContextValue | undefined
>(undefined);







export function LanguageProvider({

children,

}:{

children:ReactNode;

}){


const [
locale,
setLocaleState
]=
useState<Locale>(
defaultLocale
);






useEffect(()=>{


try{


const stored =
localStorage.getItem(
LANGUAGE_STORAGE_KEY
);



if(
stored &&
isLocale(stored)
){


setLocaleState(
stored
);


if(typeof document !== "undefined"){


document.documentElement.lang =
stored;


}


}


else{


document.documentElement.lang =
defaultLocale;


}



}

catch{


setLocaleState(
defaultLocale
);


}



},[]);








function setLocale(
newLocale:Locale
){



setLocaleState(
newLocale
);




try{


localStorage.setItem(

LANGUAGE_STORAGE_KEY,

newLocale

);




if(typeof document !== "undefined"){


document.documentElement.lang =
newLocale;


}



}

catch{


}


}







function changeLanguage(
newLocale:Locale
){


setLocale(
newLocale
);


}







const localeConfig =
useMemo(

()=>getLocaleConfig(locale),

[locale]

);







const value =
useMemo<LanguageContextValue>(

()=>({


locale,


localeConfig,


availableLocales:
locales,


setLocale,


changeLanguage,


}),

[

locale,

localeConfig,

]

);








return (

<LanguageContext.Provider

value={value}

>

{children}

</LanguageContext.Provider>

);


}









export function useLanguage(){


const context =
useContext(LanguageContext);



if(!context){


throw new Error(

"useLanguage debe utilizarse dentro de LanguageProvider"

);


}



return context;


}
