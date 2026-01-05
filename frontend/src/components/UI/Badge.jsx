const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    koha: 'bg-blue-100 text-blue-800',
    dspace: 'bg-green-100 text-green-800',
    vufind: 'bg-purple-100 text-purple-800',
    local: 'bg-gray-100 text-gray-800',
    book: 'bg-green-100 text-green-800',
    document: 'bg-blue-100 text-blue-800',
    article: 'bg-indigo-100 text-indigo-800',
    report: 'bg-yellow-100 text-yellow-800',
    thesis: 'bg-purple-100 text-purple-800',
    pdf: 'bg-red-100 text-red-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export { Badge };
export default Badge;