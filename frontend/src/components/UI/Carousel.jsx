import React from "react";
import Slider from "react-slick";
import { Clock, Phone, Mail, MapPin } from "lucide-react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Carousel = () => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 1000,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        fade: true,
        arrows: false
    };

    const slides = [
        { image: "/images/Archive.jpg", title: "Archive Collection" },
        { image: "/images/Magazine.jpg", title: "Periodicals" },
        { image: "/images/Manuscript.jpg", title: "Ancient Manuscripts" },
        { image: "/images/Microfilms.jpg", title: "Microfilm Records" },
        { image: "/images/News.jpg", title: "Daily Newspapers" },
        { image: "/images/book.jpg", title: "Rare Books" },
    ];

    return (
        <div className="relative w-full h-[900px] bg-[#0A1A2F]">
            {/* Background Image Layer */}
            <div className="absolute inset-0 z-0">
                <Slider {...settings}>
                    {slides.map((slide, index) => (
                        <div key={index} className="relative h-[900px]">
                            <img
                                src={slide.image}
                                alt={slide.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0C2B4E] via-[#0C2B4E]/80 to-transparent" />
                        </div>
                    ))}
                </Slider>
            </div>

            {/* Content Layer - Moved up */}
            <div className="relative z-30 h-full w-full max-w-[1440px] mx-auto px-8 flex flex-col justify-start pt-24 md:pt-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

                    {/* Mission Text */}
                    <div className="text-white max-w-2xl mt-8">
                        <h1 className="text-5xl md:text-6xl font-black mb-6 leading-[1.1]">
                            Ethiopian Archives and <br />
                            <span>Library Service</span>
                        </h1>
                        <p className="text-xl text-gray-300 leading-relaxed mb-8">
                            Preserving and providing access to <span className="text-white font-bold">25091 + digitized records</span> of
                            Archives, Microfilms, Newspapers, Magazines, Books, and Manuscripts
                            that document Ethiopia's history, culture, and intellectual heritage.
                        </p>
                        <div className="flex flex-wrap gap-4">

                        </div>
                    </div>

                    {/* Info Panels */}
                    <div className="space-y-2 mt-8">
                        {/* Opening Times */}
                        <div className="bg-white px-8 py-6 rounded-sm">
                            <h3 className="flex items-center text-2xl font-bold mb-6 text-gray-900 border-b border-gray-100 pb-4">
                                <Clock className="w-6 h-6 mr-3 text-blue-900" /> Opening Times
                            </h3>
                            <div className="space-y-4 text-gray-600">
                                <div className="flex justify-between items-center text-sm md:text-base">
                                    <span>Library: Mon - Sat</span>
                                    <span className="font-bold text-gray-900">8:00 AM - 6:00 PM</span>
                                </div>
                                <div className="flex justify-between items-center text-sm md:text-base">
                                    <span>Sunday</span>
                                    <span className="font-bold text-gray-900">8:30 AM - 6:00 PM</span>
                                </div>
                                <div className="flex justify-between items-center text-sm md:text-base">
                                    <span>Archives: Mon - Fri</span>
                                    <span className="font-bold text-gray-900">8:30 AM - 5:30 PM</span>
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-white px-8 py-6 rounded-sm">
                            <h3 className="flex items-center text-2xl font-bold mb-6 text-gray-900 border-b border-gray-100 pb-4">
                                <Phone className="w-6 h-6 mr-3 text-blue-900" /> Contact Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
                                <div className="space-y-2">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Phone Numbers</p>
                                    <p className="text-gray-900 font-medium">+251 11 5530058</p>
                                    <p className="text-gray-900 font-medium">+251 11 5507950</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Official Email</p>
                                    <p className="text-blue-900 font-bold">ILARMS@nala.gov.et</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Carousel;