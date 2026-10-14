import { Children, isValidElement, type FC, type ReactElement, type ReactNode } from 'react';
import { Sequence, type SequenceLayout } from '../sequence/Sequence';
import { computeSeriesStarts, formatInvalidValue, validatePositiveInteger } from '../../timing';

export type SeriesSequenceProps = {
  /** Length of this child's slot in frames. Positive integer. */
  durationInFrames: number;
  /** Passed through to the inner <Sequence>. Defaults to 'absolute-fill'. */
  layout?: SequenceLayout;
  children?: ReactNode;
};

export type SeriesProps = {
  /** One or more <Series.Sequence> elements, rendered back-to-back. */
  children?: ReactNode;
};

const describeChild = (child: ReactNode): string => {
  if (typeof child === 'string') return JSON.stringify(child);
  if (typeof child === 'number') return String(child);
  if (isValidElement(child)) {
    if (typeof child.type === 'string') return `<${child.type}>`;
    const type = child.type as { name?: string; displayName?: string };
    return `<${type.name ?? type.displayName ?? 'anonymous component'}>`;
  }
  return formatInvalidValue(child);
};

/**
 * Never actually rendered: <Series> consumes Series.Sequence elements
 * declaratively and re-renders their content inside a <Sequence> at the
 * right offset. Rendering one directly means it is not inside a <Series>.
 */
const SeriesSequenceComponent: FC<SeriesSequenceProps> = () => {
  throw new Error(
    '<Series.Sequence> must be rendered as a direct child of <Series> — <Series> consumes it declaratively and renders it as a <Sequence> at the right offset. It cannot be rendered on its own.',
  );
};

const SeriesComponent: FC<SeriesProps> = ({ children }) => {
  const items = Children.toArray(children);
  if (items.length === 0) return null;
  const slots = items.map((item, index) => {
    if (!isValidElement(item) || item.type !== SeriesSequenceComponent) {
      throw new Error(
        `<Series> only accepts <Series.Sequence> elements as children, but got ${describeChild(item)}.`,
      );
    }
    const props = (item as ReactElement<SeriesSequenceProps>).props;
    validatePositiveInteger(props.durationInFrames, '<Series.Sequence> durationInFrames');
    return { key: item.key ?? index, props };
  });
  const starts = computeSeriesStarts(slots.map((slot) => slot.props.durationInFrames));
  return (
    <>
      {slots.map((slot, index) => (
        <Sequence
          key={slot.key}
          from={starts[index]}
          durationInFrames={slot.props.durationInFrames}
          layout={slot.props.layout}
        >
          {slot.props.children}
        </Sequence>
      ))}
    </>
  );
};

type SeriesComponentType = FC<SeriesProps> & { Sequence: FC<SeriesSequenceProps> };

/**
 * Lays out children one after another in time: each <Series.Sequence> gets a
 * slot of its `durationInFrames` and observes its own frame starting at 0 —
 * no gaps, no overlap. Nested <Series> compose with enclosing scopes.
 */
export const Series = SeriesComponent as SeriesComponentType;
Series.Sequence = SeriesSequenceComponent;
