import { Title, TitleProps, Text } from '@mantine/core';
import { JSX } from 'react';

interface GradientTitleProps extends Omit<TitleProps, 'children'> {
    text: string;
    gradientFrom?: string;
    gradientTo?: string;
    component?: string;
}

export const GradientTitle = ({
    text,
    component = 'h3',
    ...titleProps
}: GradientTitleProps): JSX.Element => {
    return (
        <Title {...titleProps} component={component}>
            <Text variant="gradient"
            fw={500}
            lh="1.2"
            fz={{ base: '2rem', xs: '2.5rem', sm: '3rem', md: '3.5rem' }}>
                {text}
            </Text>
        </Title>
    );
};
