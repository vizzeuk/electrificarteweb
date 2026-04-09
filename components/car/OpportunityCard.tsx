"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { formatCLP } from "@/lib/utils";

interface OpportunityCardProps {
  name: string;
  slug: string;
  image: string;
  basePrice: number;
  discountPrice: number;
  index?: number;
}

export function OpportunityCard({
  name,
  slug,
  image,
  basePrice,
  discountPrice,
  index = 0,
}: OpportunityCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="group border border-border p-4 rounded-xl flex flex-col hover:border-primary transition-colors"
    >
      <Link href={`/auto/${slug}`} aria-label={`Ver oferta ${name}`}>
        <div className="aspect-[4/3] bg-gray-50 rounded-lg mb-4 overflow-hidden">
          <img
            src={image}
            alt={`${name} - Oferta auto electrico Chile`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      </Link>

      <h4 className="font-bold text-center mb-4 font-headline">{name}</h4>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
          <span>P. Normal</span>
          <span>{formatCLP(basePrice)}</span>
        </div>
        <div className="flex justify-between text-xs font-black">
          <span>P. CON DCTO</span>
          <span className="text-primary-dark">{formatCLP(discountPrice)}</span>
        </div>
      </div>

      <Link
        href={`/auto/${slug}`}
        className="mt-auto w-full py-2.5 bg-primary font-bold text-xs rounded-lg uppercase tracking-widest hover:bg-black hover:text-white transition-colors text-center block"
      >
        Lo Quiero
      </Link>
    </motion.article>
  );
}
