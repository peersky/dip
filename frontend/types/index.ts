export type SiteMapItemType = "EMPTY" | "CONTENT" | "EXTERNAL" | "FOOTER_CATEGORY";

export interface SiteMapItem {
  title: string;
  path: string;
  type: SiteMapItemType;
  children?: SiteMapItem[];
  hideInFooter?: boolean;
  authenticated?: boolean;
}

export type SiteMap = SiteMapItem[];
