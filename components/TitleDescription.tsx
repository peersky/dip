import { Text } from '@mantine/core';
import { JSX } from 'react';

export const TitleDescription = ({
    text,
}: {
    text: string;
}): JSX.Element => {
    return (
        <Text size="md" variant="outline" fz={{ base: 'sm', xs: 'md' }}
            c="dimmed" ta="center" dangerouslySetInnerHTML={{ __html: text }} />
    );
};
