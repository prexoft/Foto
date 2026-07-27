import React, { useState } from 'react';
import { X, Play, ArrowRight, ArrowUpRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import catImg from '../assets/cat.png';
import avatarsImg from '../assets/avatars.png';

interface IntroOverlayProps {
  onSelectIndividual: () => void;
  onSelectBusiness: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({
  onSelectIndividual,
  onSelectBusiness,
  currentStep,
  setCurrentStep
}) => {

  const steps = [
    {
      title: "Introducing Foto...",
      description: "On device, Unlimited image generator. Create beautiful, high-dimension images without relying on paid tools.",
      image: catImg,
      isVideo: true,
      buttons: (
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setCurrentStep(1)}
          >
            Got it, Continue
            <ArrowRight />
          </Button>
        </div>
      )
    },
    {
      title: (
        <>
          Uncensored and unlimited, Create imagination using <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Foto</span>.
        </>
      ),
      description: "Generate as many images as you want with no monthly subscription fees, queue times, or censorship filters. Everything runs securely on your hardware.",
      image: avatarsImg, // Placeholder collaborators image
      buttons: (
        <div className="flex items-center justify-center">
          <Button
            onClick={() => setCurrentStep(2)}
          >
            Understood, Go ahead
            <ArrowRight />
          </Button>
        </div>
      )
    },
    {
      title: (
        <>
          Get a business license to use frontier <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">enterprise</span> model.
        </>
      ),
      description: "Unlock full commercial rights, premium high-fidelity models, and enterprise support to integrate Foto into your company's production workflows.",
      image: "https://static.vecteezy.com/system/resources/previews/071/768/989/non_2x/3d-handshake-icon-business-with-agreement-and-collaboration-concept-free-png.png", // Placeholder cloud image
      isCloud: true,
      buttons: (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={onSelectBusiness}
            variant='secondary'
          >
            Get a business license
            <ArrowUpRight />
          </Button>
          <Button
            onClick={onSelectIndividual}
          >
            No, I'll use for free
          </Button>
        </div>
      )
    }
  ];

  const activeStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-none flex items-center justify-center overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#191919] rounded-3xl p-2.5 shadow-xl flex flex-col items-center space-y-5 text-center select-text transition-all duration-300">

        {/* Top Image / Graphic Area */}
        <div className="w-full flex items-center justify-center pb-2">
          {activeStep.isVideo ? (
            <div className="relative w-full aspect-[1/0.8] rounded-2xl overflow-hidden bg-neutral-900 shadow-xl">
              <img
                src={activeStep.image}
                alt="Video preview"
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          ) : (
            <div className="relative w-64 h-48 flex items-center justify-center">
              {/* Collaborators Graphic representation */}
              <img
                src={activeStep.image}
                alt="Collaborators"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="space-y-1.5 w-full px-2">
          <h2 className="text-xl font-bold text-neutral-100 max-w-sm mx-auto">
            {activeStep.title}
          </h2>
          <p className="text-[0.78rem] text-neutral-400 font-medium leading-relaxed max-w-sm mx-auto">
            {activeStep.description}
          </p>
        </div>

        {/* Buttons / Actions Area */}
        <div className="w-full">
          {activeStep.buttons}
        </div>

        {/* Step Indicator Dot Carousel */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-1 rounded-full transition-all duration-300 ${index === currentStep
                  ? 'w-2.5 bg-neutral-200'
                  : 'w-1.5 bg-neutral-600'
                }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};


