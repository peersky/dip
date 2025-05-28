import { Modal, Stack, Text, Group, Button, TextInput, ActionIcon, Tooltip } from "@mantine/core";
import { IconBrandTwitter, IconBrandFacebook, IconCopy, IconCheck } from "@tabler/icons-react";
import { CopyButton } from "@mantine/core";

interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
  proposalText: string;
  proposalId: string;
  proposerCountry: string;
  shareType?: 'propose' | 'superlike';
}

export function ShareModal({
  opened,
  onClose,
  proposalText,
  proposalId,
  proposerCountry,
  shareType = 'propose'
}: ShareModalProps) {
  const getShareableUrl = () => {
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
    return `${baseUrl}?improvement=${proposalId}`;
  };

  const getShareText = () => {
    const maxLength = 200;
    const text = proposalText.slice(0, maxLength);

    // Find the last occurrence of a sentence-ending punctuation mark
    const lastPunctuationIndex = Math.max(
      text.lastIndexOf('.'),
      text.lastIndexOf('!'),
      text.lastIndexOf('?'),
      text.lastIndexOf(';')
    );

    const truncatedText = lastPunctuationIndex > 0
      ? text.slice(0, lastPunctuationIndex + 1)
      : text + '...';

    if (shareType === 'superlike') {
      return `I Super like #WIP for #${proposerCountry}_DAO: ${truncatedText} See it on Peeramid Network:\n`;
    }
    return `I am proposing #WIP for #${proposerCountry}_DAO: ${truncatedText} See it on Peeramid Network:\n`;
  };

  const shareToTwitter = () => {
    const url = getShareableUrl();
    const text = getShareText();
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToFarcaster = () => {
    const url = getShareableUrl();
    const text = getShareText();
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Share this proposal"
      centered
      size="md"
    >
      <Stack gap="md">
        <Text>Share this proposal from {proposerCountry}:</Text>
        <Text fw={500} size="md">{proposalText}</Text>

        <Group>
          <TextInput
            readOnly
            value={getShareableUrl()}
            style={{ flexGrow: 1 }}
            rightSection={
              <CopyButton value={getShareableUrl()} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow position="right">
                    <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            }
          />
        </Group>

        <Group justify="center" gap="md" mt="sm">
          <Button
            leftSection={<IconBrandTwitter size={18} />}
            color="#1DA1F2"
            onClick={shareToTwitter}
          >
            Twitter
          </Button>
          <Button
            leftSection={<IconBrandFacebook size={18} />}
            color="#4267B2"
            onClick={shareToFarcaster}
          >
            Farcaster
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}