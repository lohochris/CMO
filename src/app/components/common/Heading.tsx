import React from 'react';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

const levelStyles: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: 'text-3xl lg:text-4xl font-extrabold text-[#ffd700]',
  2: 'text-xl lg:text-2xl font-bold text-white',
  3: 'text-lg lg:text-xl font-semibold text-[#ffd700]',
  4: 'text-base font-semibold text-emerald-100',
  5: 'text-sm font-medium text-gray-300',
  6: 'text-xs font-bold uppercase tracking-wider text-yellow-500/90',
};

export const Heading: React.FC<HeadingProps> = ({
  level,
  children,
  className = '',
  ...props
}) => {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const defaultStyle = levelStyles[level] || levelStyles[2];

  return (
    <Tag className={`${defaultStyle} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
};

export default Heading;
