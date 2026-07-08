// file: apps/playground-angular/src/app/features/ai/providers/components/provider-manager.component.ts

import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type {
  IAiApiKeyResponseDto,
  IAiModelResponseDto,
  IAiProviderResponseDto,
} from '@genspire/sdk-ai';
import type { AppOverlayHandle } from '../../../../shared/overlay';
import { AiProviderClient } from '../ai-provider.client';
import { ProviderApiKeysComponent } from './provider-api-keys.component';
import { ProviderDetailComponent } from './provider-detail.component';
import { ProviderListComponent } from './provider-list.component';
import { ProviderModelEditorComponent } from './provider-model-editor.component';

@Component({
  selector: 'app-ai-provider-manager',
  standalone: true,
  imports: [
    CommonModule,
    ProviderListComponent,
    ProviderDetailComponent,
    ProviderModelEditorComponent,
    ProviderApiKeysComponent,
  ],
  template: `
    <div class="h-[min(44rem,calc(100vh-2rem))] w-[min(72rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
      <div class="grid h-full min-h-0 grid-cols-[20rem_minmax(0,1fr)]">
        <aside class="flex min-h-0 flex-col border-r border-base-300 bg-base p-4">
          <app-ai-provider-list
            [providers]="providers()"
            [selectedProviderId]="selectedProviderId()"
            [showClose]="true"
            (select)="selectProvider($event)"
            (create)="createProvider($event)"
            (close)="close()"
          />
        </aside>

        <section class="min-h-0 overflow-y-auto p-6">
          @if (selectedProvider()) {
            <div class="flex flex-col gap-6">
              <app-ai-provider-detail
                [provider]="selectedProvider()"
                [clientKinds]="clientKinds()"
                (save)="saveProvider()"
                (delete)="deleteProvider()"
              />

              <app-ai-provider-model-editor
                [models]="providerModels()"
                [selectedModelId]="selectedModelId()"
                (create)="createModel()"
                (selectModel)="selectModel($event)"
                (save)="saveModel()"
                (delete)="deleteModel()"
                (requestDelete)="requestDeleteModel($event)"
              />

              <app-ai-provider-api-keys
                [apiKeys]="providerApiKeys()"
                (create)="createApiKey()"
              />
            </div>
          } @else {
            <app-ai-provider-detail [provider]="null" />
          }
        </section>
      </div>
    </div>
  `,
})
export class ProviderManagerComponent implements OnInit {
  readonly overlayHandle = input<AppOverlayHandle | null>(null);

  private readonly providerClient = inject(AiProviderClient);

  protected readonly clientKinds = signal<string[]>([]);
  protected readonly providers = signal<IAiProviderResponseDto[]>([]);
  protected readonly providerModels = signal<IAiModelResponseDto[]>([]);
  protected readonly providerApiKeys = signal<IAiApiKeyResponseDto[]>([]);

  protected readonly selectedProviderId = signal<string | null>(null);
  protected readonly selectedModelId = signal<string | null>(null);

  protected readonly selectedProvider = computed<IAiProviderResponseDto | null>(() =>
    this.providers().find((provider) => provider.id === this.selectedProviderId()) ?? null,
  );

  protected readonly detailRef = viewChild(ProviderDetailComponent);
  protected readonly modelEditorRef = viewChild(ProviderModelEditorComponent);
  protected readonly apiKeysRef = viewChild(ProviderApiKeysComponent);

  async reloadProviders(): Promise<void> {
    const providers = await this.providerClient.listProviders();
    this.providers.set(providers);

    const selectedId = this.selectedProviderId();
    const nextSelectedId =
      selectedId && providers.some((provider) => provider.id === selectedId)
        ? selectedId
        : (providers[0]?.id ?? null);

    if (!nextSelectedId) {
      this.selectedProviderId.set(null);
      this.providerModels.set([]);
      this.providerApiKeys.set([]);
      this.modelEditorRef()?.hydrate(null);
      return;
    }

    await this.selectProvider(nextSelectedId);
  }

  async ngOnInit(): Promise<void> {
    const [clientKinds] = await Promise.all([
      this.providerClient.listClientKinds(),
      this.reloadProviders(),
    ]);

    this.clientKinds.set(clientKinds);
  }

  close(): void {
    this.overlayHandle()?.close();
  }

  protected async createProvider(name: string): Promise<void> {
    if (!name) return;

    const provider = await this.providerClient.createProvider({
      name,
      kind: 'custom',
      clientKind: 'openai-compatible',
    });

    this.providers.update((current) => [provider, ...current]);
    await this.selectProvider(provider.id);
  }

  protected async selectProvider(providerId: string): Promise<void> {
    this.selectedProviderId.set(providerId);

    const provider =
      this.providers().find((item) => item.id === providerId)
      ?? (await this.providerClient.listProviders()).find((item) => item.id === providerId)
      ?? null;

    if (!provider) return;

    this.detailRef()?.hydrate(provider);

    const [models, apiKeys] = await Promise.all([
      this.providerClient.listModels(providerId),
      this.providerClient.listApiKeys(providerId),
    ]);

    this.providerModels.set(models);
    this.providerApiKeys.set(apiKeys);
    this.selectedModelId.set(models[0]?.id ?? null);
    this.modelEditorRef()?.hydrate(models[0] ?? null);
  }

  protected async saveProvider(): Promise<void> {
    const provider = this.selectedProvider();
    const draft = this.detailRef()?.read();
    if (!provider || !draft) return;

    const updated = await this.providerClient.updateProvider(provider.id, {
      name: draft.name || undefined,
      clientKind: draft.clientKind || undefined,
      baseUrl: draft.baseUrl || undefined,
      doc: draft.doc || undefined,
      website: draft.website || undefined,
    });

    this.providers.update((current) =>
      current.map((item) => item.id === updated.id ? updated : item),
    );
    this.detailRef()?.hydrate(updated);
  }

  protected async deleteProvider(): Promise<void> {
    const provider = this.selectedProvider();
    if (!provider) return;

    await this.providerClient.deleteProvider(provider.id);

    const remainingProviders = this.providers().filter((item) => item.id !== provider.id);
    this.providers.set(remainingProviders);

    const nextProviderId = remainingProviders[0]?.id ?? null;
    if (!nextProviderId) {
      this.selectedProviderId.set(null);
      this.providerModels.set([]);
      this.providerApiKeys.set([]);
      this.modelEditorRef()?.hydrate(null);
      return;
    }

    await this.selectProvider(nextProviderId);
  }

  protected async createModel(): Promise<void> {
    const provider = this.selectedProvider();
    const editor = this.modelEditorRef();
    if (!provider || !editor) return;

    const { name, family } = editor.readNewModel();
    if (!name) return;

    const created = await this.providerClient.createModel(provider.id, {
      name,
      family: family || undefined,
    });

    this.providerModels.update((current) => [...current, created]);
    this.selectedModelId.set(created.id);
    editor.hydrate(created);
  }

  protected selectModel(modelId: string): void {
    this.selectedModelId.set(modelId);
    const model = this.providerModels().find((item) => item.id === modelId) ?? null;
    this.modelEditorRef()?.hydrate(model);
  }

  protected requestDeleteModel(modelId: string): void {
    if (this.selectedModelId() !== modelId) {
      this.selectModel(modelId);
    }
  }

  protected async saveModel(): Promise<void> {
    const provider = this.selectedProvider();
    const model = this.providerModels().find((item) => item.id === this.selectedModelId()) ?? null;
    const editor = this.modelEditorRef();
    if (!provider || !model || !editor) return;

    const updated = await this.providerClient.updateModel(provider.id, model.id, {
      name: editor.read().name || undefined,
      family: editor.read().family || undefined,
      capabilities: editor.readCapabilities(model),
    });

    this.providerModels.update((current) =>
      current.map((item) => item.id === updated.id ? updated : item),
    );
    editor.hydrate(updated);
  }

  protected async deleteModel(): Promise<void> {
    const provider = this.selectedProvider();
    const model = this.providerModels().find((item) => item.id === this.selectedModelId()) ?? null;
    if (!provider || !model) return;

    await this.providerClient.deleteModel(provider.id, model.id);

    const remainingModels = this.providerModels().filter((item) => item.id !== model.id);
    this.providerModels.set(remainingModels);

    const nextModel = remainingModels[0] ?? null;
    this.selectedModelId.set(nextModel?.id ?? null);
    this.modelEditorRef()?.hydrate(nextModel);
  }

  protected async createApiKey(): Promise<void> {
    const provider = this.selectedProvider();
    const apiKeys = this.apiKeysRef();
    if (!provider || !apiKeys) return;

    const { name, value, env } = apiKeys.read();
    if (!name) return;

    const created = await this.providerClient.createApiKey(provider.id, {
      name,
      value: value || undefined,
      env: env || undefined,
      enabled: true,
    });

    this.providerApiKeys.update((current) => [created, ...current]);
    apiKeys.reset();
  }
}
