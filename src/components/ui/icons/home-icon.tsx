import { SVGProps } from 'react';

interface HomeIconProps extends SVGProps<SVGSVGElement> {
  active?: boolean;
}

export function HomeIcon({ active = false, ...props }: HomeIconProps) {
  return (
    <svg
      fill="none"
      height="24"
      preserveAspectRatio="xMidYMid meet"
      version="1.0"
      viewBox="0 0 32 32"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <clipPath id="253a77b7de">
          <path
            clipRule="nonzero"
            d="M 0.277344 0 L 26.121094 0 L 26.121094 18.742188 L 0.277344 18.742188 Z M 0.277344 0 "
          />
        </clipPath>
        <clipPath id="3000aaa8b4">
          <path
            clipRule="nonzero"
            d="M 3.203125 0 L 23.191406 0 C 24.808594 0 26.117188 1.308594 26.117188 2.925781 L 26.117188 15.816406 C 26.117188 17.429688 24.808594 18.742188 23.191406 18.742188 L 3.203125 18.742188 C 1.585938 18.742188 0.277344 17.429688 0.277344 15.816406 L 0.277344 2.925781 C 0.277344 1.308594 1.585938 0 3.203125 0 Z M 3.203125 0 "
          />
        </clipPath>
        <clipPath id="c37aecee37">
          <path
            clipRule="nonzero"
            d="M 0.277344 0 L 26.121094 0 L 26.121094 18.742188 L 0.277344 18.742188 Z M 0.277344 0 "
          />
        </clipPath>
        <clipPath id="e0f3f58435">
          <path
            clipRule="nonzero"
            d="M 3.203125 0 L 23.191406 0 C 24.808594 0 26.117188 1.308594 26.117188 2.925781 L 26.117188 15.816406 C 26.117188 17.429688 24.808594 18.742188 23.191406 18.742188 L 3.203125 18.742188 C 1.585938 18.742188 0.277344 17.429688 0.277344 15.816406 L 0.277344 2.925781 C 0.277344 1.308594 1.585938 0 3.203125 0 Z M 3.203125 0 "
          />
        </clipPath>
        <clipPath id="35b5a401f8">
          <rect height="19" width="27" x="0" y="0" />
        </clipPath>
        <clipPath id="dc20c42293">
          <path
            clipRule="nonzero"
            d="M 7 4 L 19 4 L 19 16.824219 L 7 16.824219 Z M 7 4 "
          />
        </clipPath>
        <clipPath id="80c9d1cef1">
          <path
            clipRule="nonzero"
            d="M 5.621094 2.199219 L 20.976562 2.199219 L 20.976562 10 L 5.621094 10 Z M 5.621094 2.199219 "
          />
        </clipPath>
      </defs>
      <g transform="matrix(1.1904761905 0 0 1.1904761905 0 4.3928571429)">
        <g clipPath="url(#253a77b7de)">
          <g clipPath="url(#3000aaa8b4)">
            <g transform="matrix(1, 0, 0, 1, 0, -0.000000000000003458)">
              <g clipPath="url(#35b5a401f8)">
                <g clipPath="url(#c37aecee37)">
                  <g clipPath="url(#e0f3f58435)">
                    <path
                      d="M 0.277344 0 L 26.121094 0 L 26.121094 18.742188 L 0.277344 18.742188 Z M 0.277344 0 "
                      fill={active ? '#aed580' : 'gray'}
                      fillOpacity="1"
                      fillRule="nonzero"
                    />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
        <g clipPath="url(#dc20c42293)">
          <path
            d="M 18.515625 9.488281 Z M 18.515625 9.488281 L 13.199219 4.78125 L 7.875 9.492188 L 7.875 16.222656 C 7.875 16.398438 8.015625 16.535156 8.191406 16.535156 L 11.515625 16.535156 L 11.515625 13.585938 C 11.515625 13.410156 11.65625 13.269531 11.828125 13.269531 L 14.5625 13.269531 C 14.734375 13.269531 14.875 13.410156 14.875 13.585938 L 14.875 16.535156 L 18.199219 16.535156 C 18.375 16.535156 18.515625 16.398438 18.515625 16.222656 Z M 7.875 9.492188 Z M 7.875 9.492188 "
            fill="white"
            fillOpacity="1"
            fillRule="nonzero"
          />
        </g>
        <g clipPath="url(#80c9d1cef1)">
          <path
            d="M 13.167969 2.203125 L 5.621094 8.882812 L 6.414062 9.78125 L 13.199219 3.777344 L 19.976562 9.78125 L 20.769531 8.882812 L 13.226562 2.203125 L 13.199219 2.238281 Z M 13.167969 2.203125 "
            fill="white"
            fillOpacity="1"
            fillRule="nonzero"
          />
        </g>
        <path
          d="M 7.875 3.164062 L 9.789062 3.164062 L 9.773438 4.296875 L 7.875 6.011719 Z M 7.875 3.164062 "
          fill="white"
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
    </svg>
  );
}
