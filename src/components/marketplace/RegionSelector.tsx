// ==========================================================
// ARCHIVO: src/components/marketplace/RegionSelector.tsx
// Credi Marketplace
//
// Selector de región / mercado
//
// Next.js 16.3 · React 19.2 · TypeScript
// ==========================================================

'use client';


import {
  useState,
} from 'react';



interface Region {

  code: string;

  name: string;

  currency?: string;

}



interface RegionSelectorProps {

  regions: readonly Region[];

  defaultRegion?: string;

  onChange?: (
    region: Region,
  ) => void;

}



export default function RegionSelector({

  regions,

  defaultRegion,

  onChange,

}: RegionSelectorProps) {


  const [
    selected,
    setSelected,
  ] = useState(

    defaultRegion ??
    regions[0]?.code ??
    ''

  );



  function handleChange(
    value: string,
  ) {


    setSelected(value);



    const region =
      regions.find(
        (item) =>
          item.code === value,
      );



    if (region) {

      onChange?.(region);

    }

  }



  return (

    <div

      className="
        flex

        flex-col

        gap-2
      "

    >

      <label

        htmlFor="region"

        className="
          text-sm

          font-medium

          text-gray-700
        "

      >

        Región

      </label>



      <select

        id="region"

        value={selected}

        onChange={
          (event) =>
            handleChange(
              event.target.value,
            )
        }

        className="
          rounded-lg

          border

          border-gray-300

          bg-white

          px-4

          py-3

          text-gray-900

          outline-none

          focus:ring-2

          focus:ring-blue-500
        "

      >

        {
          regions.map(
            (region) => (

              <option

                key={region.code}

                value={region.code}

              >

                {region.name}

                {
                  region.currency
                    ? ` (${region.currency})`
                    : ''
                }

              </option>

            )
          )
        }


      </select>


    </div>

  );

}
