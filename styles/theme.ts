import { createTheme, Button, Modal, Tooltip, Anchor } from "@mantine/core";
import { Poppins } from 'next/font/google';

const poppins = Poppins({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
});

export const theme = createTheme({
    fontFamily: poppins.style.fontFamily,
    defaultGradient: { from: '#C1C2C5 40%', to: '#fc466b', deg: 170 },
    colors: {
        teal: [
            '#E6FCF5',
            '#C3FAE8',
            '#96F2D7',
            '#63E6BE',
            '#38D9A9',
            '#20C997',
            '#12B886',
            '#008080',
            '#087F5A',
            '#087F5B'
        ],
        purple: [
            '#F8F0FC',
            '#F3D9FA',
            '#EEBEFA',
            '#E599F7',
            '#DA77F2',
            '#CC5DE8',
            '#BE4BDB',
            '#AE3EC9',
            '#9C36B5',
            '#862E9C',
        ],
        blue: [
            '#E7F5FF',
            '#D0EBFF',
            '#A5D8FF',
            '#74C0FC',
            '#4DABF7',
            '#4897D8',
            '#228BE6',
            '#1C7ED6',
            '#1971C2',
            '#1864AB',
        ],
        gray: [
            '#F8F9FA',
            '#F1F3F5',
            '#E9ECEF',
            '#DEE2E6',
            '#CED4DA',
            '#B7B7B7',
            '#868E96',
            '#495057',
            '#343A40',
            '#212529'
        ]
    },
    components: {
        Button: Button.extend({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vars: (theme, props) => {
                if (!props.variant) {
                    return {
                        root: {
                            "--button-bg": theme.colors.teal[7],
                            "--button-hover": "rgba(0, 128, 128, 0.50)",
                            "--button-fw": "700",
                        },
                    };
                }

                if (props.variant === 'light') {
                    return {
                        root: {
                            ...(props.disabled && {
                                borderColor: theme.colors.gray[6],
                            }),
                        },
                    };
                }

                if (props.variant === "outline") {
                    return {
                        root: {
                            "--button-color": "white",
                            "--button-bg": "transparent",
                            borderRadius: "50px",
                            fontSize: "var(--mantine-font-size-md)",
                            // marginTop: "var(--mantine-spacing-md)",
                            borderColor: theme.colors.dark[1],
                            boxShadow: "0 0px 0px 4px rgba(255, 255, 255, 0.1)",
                            transition: "box-shadow 0.5s ease",
                            color: theme.colors.dark[0],
                        },
                    };
                }




                if (props.variant === "transparent") {
                    return {
                        root: {
                            "--button-color": "teal",
                            fontWeight: '600',
                            ...(props.className === "with-border" && {
                                border: `1px solid ${theme.colors.teal[7]}`,
                            }),
                        },
                    };
                }

                return { root: {} };
            },
        }),
        Tooltip: Tooltip.extend({
            defaultProps: {
                events: { hover: true, touch: true, focus: false },
                withinPortal: true,
                openDelay: 200,
                closeDelay: 200,
            },
        }),
        Anchor: Anchor.extend({
            defaultProps: {
                styles: {
                    root: {
                        color: "teal",
                    }
                }
            }
        }),
        Modal: Modal.extend({
            defaultProps: {
                styles: {
                    title: {
                        fontWeight: 700,
                        fontSize: "2rem"
                    }
                }
            }
        }),
    },
});
