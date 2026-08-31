// ==========================================================
// ARCHIVO: src/components/seller/B2BProductForm.tsx
// Credi Marketplace
//
// Formulario creación producto B2B
// ==========================================================

'use client';


import {
  useState,
} from 'react';



interface B2BProductFormProps {

  onSubmit?: (
    data: {
      name:string;
      price:number;
      stock:number;
    }
  ) => void;

}



export default function B2BProductForm({

  onSubmit,

}: B2BProductFormProps) {


  const [
    name,
    setName,
  ] = useState('');



  const [
    price,
    setPrice,
  ] = useState('');



  const [
    stock,
    setStock,
  ] = useState('');



  function submit(
    event:React.FormEvent
  ){

    event.preventDefault();


    onSubmit?.({

      name,

      price:Number(price),

      stock:Number(stock),

    });


  }



  return (

    <form

      onSubmit={submit}

      className="
        space-y-4

        rounded-xl

        border

        bg-white

        p-6
      "

    >

      <h2 className="text-xl font-bold">

        Crear producto B2B

      </h2>


      <input

        value={name}

        onChange={
          e=>setName(e.target.value)
        }

        placeholder="Nombre del producto"

        className="input"

      />


      <input

        value={price}

        onChange={
          e=>setPrice(e.target.value)
        }

        placeholder="Precio"

        type="number"

        className="input"

      />


      <input

        value={stock}

        onChange={
          e=>setStock(e.target.value)
        }

        placeholder="Stock"

        type="number"

        className="input"

      />


      <button

        className="
          rounded-lg

          bg-blue-600

          px-4

          py-2

          text-white
        "

      >

        Guardar producto

      </button>


    </form>

  );

}
