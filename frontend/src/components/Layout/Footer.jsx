const Footer = () => {
    return (
        <footer className="bg-[#0C2B4E]  py-8 mt-auto text-white">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="font-bold text-lg mb-4">የኢኖቬሽን እና ቴክኖሎጂ ሚኒስቴር</h3>

                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">የግጠማ ማዕከል</h4>
                        <div className="text-sm space-y-2">
                            <p>ኢሜይል: contact@mint.gov.et</p>
                            <p>ስልክ: +251900000000</p>
                            <p>አድራሻ: አዲስ አበባ፣ ኢትዮጵያ</p>
                        </div>
                    </div>


                </div>

                <div className="border-t border-gray-600 mt-8 pt-4 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} የኢኖቬሽን እና ቴክኖሎጂ ሚኒስቴር። ሁሉም መብቶች ተጠብቀዋል።</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
