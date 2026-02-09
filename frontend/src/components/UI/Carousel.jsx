import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import court1 from "../../assets/court1.png";
import court2 from "../../assets/court2.png";
import court3 from "../../assets/court3.png";

const Carousel = () => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3000,
    };

    const images = [court1, court2, court3];

    return (
        <div className="w-full overflow-hidden">
            <Slider {...settings}>
                {images.map((image, index) => (
                    <div key={index}>
                        <img src={image} alt={`Slide ${index + 1}`} className="w-full h-96 object-cover" />
                    </div>
                ))}
            </Slider>
        </div>
    );
};

export default Carousel;
