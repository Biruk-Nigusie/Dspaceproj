const HowItWorks = () => {
    const steps = [
        {
            number: 1,
            title: "ይመዝገቡ / ይግቡ",
            description:
                "አካላዊ መጻሕፍትን ለመበደር እና የእርስዎን የማስገባት ታሪክ ለማግኘት የቤተ መጻሕፍት መለያ ይፍጠሩ።",
            color: "bg-blue-600",
        },
        {
            number: 2,
            title: "ይፈልጉ እና ያግኙ",
            description: "በርዕስ፣ በደራሲ ወይም በርዕሰ ጉዳይ መጻሕፍትን ለማግኘት የፍለጋ አሞሌን ይጠቀሙ።",
            color: "bg-blue-600",
        },
        {
            number: 3,
            title: "አካላዊ መጻሕፍት ይበደሩ",
            description: '"መጽሐፍ ይበደሩ" የሚለውን ይጫኑ። ሁኔታው በቤተ መጻሕፍት ስርዓት ይከታተላል።',
            color: "bg-blue-600",
        },
        {
            number: 4,
            title: "ዲጂታል መጻሕፍት ያንብቡ",
            description: '"ያንብቡ / ያውርዱ" የሚለውን ይጫኑ። ዲጂታል ይዘቶችን በአሳሽዎ ያንብቡ።',
            color: "bg-green-600",
        },
        {
            number: 5,
            title: "አዲስ ይዘቶች ያስገቡ",
            description: '"ይዘት ያስገቡ" የሚለውን ይጫኑ። ፋይሎችን ይምረጡ እና መረጃዎችን ያሟሉ።',
            color: "bg-orange-600",
        },
        {
            number: 6,
            title: "ማስገባቶችን ይከታተሉ",
            description: "የእርስዎ ማስገባት ወደ ስርዓቱ ከተሰቀለ በኋላ ይታያል።",
            color: "bg-purple-600",
        },
    ];

    return (
        <section className="bg-gray-50 py-16">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">እንዴት እንደሚሰራ</h2>
                    <p className="text-xl text-gray-600">
                        የፌደራል ጠቅላይ ፍርድ ቤት ዲጂታል ሪፖዚተሪን ለመጠቀም ቀላል ደረጃዎች
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="text-center bg-white p-6 rounded-lg shadow-sm"
                        >
                            <div
                                className={`w-12 h-12 mx-auto mb-4 rounded-full ${step.color} text-white flex items-center justify-center font-bold text-lg`}
                            >
                                {step.number}
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                {step.title}
                            </h3>
                            <p className="text-gray-600">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
